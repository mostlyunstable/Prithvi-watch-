import os
import sys
import gzip
import urllib.request
import pandas as pd
import rasterio
from rasterio.merge import merge
import numpy as np
from pathlib import Path
import ssl

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.ml.providers import get_historical_landslides

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"

TILES = ["N25E091", "N26E091", "N27E088", "N27E092"]

def get_real_dem(dem_path, dem_dir):
    print("Acquiring and Mosaicking SRTM Tiles...")
    hgt_files = []
    for tile in TILES:
        url = f"https://s3.amazonaws.com/elevation-tiles-prod/skadi/{tile[:3]}/{tile}.hgt.gz"
        gz_path = dem_dir / f"{tile}.hgt.gz"
        hgt_path = dem_dir / f"{tile}.hgt"
        
        if not hgt_path.exists():
            print(f"Downloading {tile}...")
            import subprocess
            try:
                subprocess.run(["curl", "-k", "-L", "-o", str(gz_path), url], check=True)
                with gzip.open(gz_path, 'rb') as f_in, open(hgt_path, 'wb') as f_out:
                    f_out.write(f_in.read())
            except Exception as e:
                print(f"Failed to download {tile}: {e}")
                continue
        hgt_files.append(str(hgt_path))
        
    print(f"Mosaicking {len(hgt_files)} tiles...")
    src_files_to_mosaic = [rasterio.open(fp) for fp in hgt_files]
    mosaic, out_trans = merge(src_files_to_mosaic)
    out_meta = src_files_to_mosaic[0].meta.copy()
    out_meta.update({"driver": "GTiff", "height": mosaic.shape[1], "width": mosaic.shape[2], "transform": out_trans})
    
    with rasterio.open(dem_path, "w", **out_meta) as dest:
        dest.write(mosaic)
    for src in src_files_to_mosaic: src.close()
    return mosaic, out_trans

def calculate_terrain(dem_path, dem_dir):
    print("Calculating true Slope and Aspect for mosaic with WGS84 spherical metric scaling...")
    with rasterio.open(dem_path) as src:
        elev = src.read(1).astype(float)
        elev[elev == src.nodata] = np.nan
        
        # Calculate latitude-dependent meters per degree
        mean_lat = (src.bounds.bottom + src.bounds.top) / 2.0
        meters_per_deg_lat = 111319.5
        meters_per_deg_lon = 111319.5 * np.cos(np.radians(mean_lat))
        
        res_x_m = src.res[0] * meters_per_deg_lon
        res_y_m = src.res[1] * meters_per_deg_lat
        
        dx, dy = np.gradient(elev, res_x_m, res_y_m)
        slope = np.degrees(np.arctan(np.sqrt(dx**2 + dy**2)))
        aspect = np.degrees(np.arctan2(dy, -dx))
        aspect = np.where(aspect < 0, 90.0 - aspect, 90.0 - aspect)
        aspect = np.where(aspect < 0, 360.0 + aspect, aspect)
        
        profile = src.profile
        profile.update(dtype=rasterio.float32, nodata=np.nan)
        slope_path = dem_dir / "slope.tif"
        aspect_path = dem_dir / "aspect.tif"
        
        with rasterio.open(slope_path, 'w', **profile) as dst: dst.write(slope.astype(np.float32), 1)
        with rasterio.open(aspect_path, 'w', **profile) as dst: dst.write(aspect.astype(np.float32), 1)
    return slope_path, aspect_path

def build_dataset():
    dem_dir = DATA_DIR / "dem"
    dem_dir.mkdir(parents=True, exist_ok=True)
    dem_path = dem_dir / "real_dem.tif"
    
    if not dem_path.exists(): get_real_dem(dem_path, dem_dir)
    slope_path = dem_dir / "slope.tif"
    if not slope_path.exists(): slope_path, aspect_path = calculate_terrain(dem_path, dem_dir)
    else: aspect_path = dem_dir / "aspect.tif"
    
    try: ls_df = get_historical_landslides()
    except Exception as e: return
        
    lat_col = 'latitude' if 'latitude' in ls_df.columns else 'lat'
    lon_col = 'longitude' if 'longitude' in ls_df.columns else 'lon'
    valid_coords = ls_df.dropna(subset=[lat_col, lon_col]).drop_duplicates(subset=[lat_col, lon_col])
    
    positives, positive_coords = [], set()
    with rasterio.open(dem_path) as src_elev, rasterio.open(slope_path) as src_slope, rasterio.open(aspect_path) as src_aspect:
        dem_bounds = src_elev.bounds
        elev_data = src_elev.read(1)
        slope_data = src_slope.read(1)
        aspect_data = src_aspect.read(1)
        
        for idx, row in valid_coords.iterrows():
            lon, lat = row[lon_col], row[lat_col]
            if not (dem_bounds.left <= lon <= dem_bounds.right and dem_bounds.bottom <= lat <= dem_bounds.top): continue
            try:
                r, c = src_elev.index(lon, lat)
                elev, slope, aspect = float(elev_data[r, c]), float(slope_data[r, c]), float(aspect_data[r, c])
                if np.isnan(elev) or np.isnan(slope): continue
                spatial_group = f"{int(np.floor(lat))}_{int(np.floor(lon))}"
                date_val = row.get('event_date', "2023/07/15 00:00:00+00")
                positives.append({'latitude': lat, 'longitude': lon, 'elevation': elev, 'slope': slope, 'aspect': aspect, 'label': 1, 'spatial_group': spatial_group, 'date': date_val})
                positive_coords.add((r, c))
            except: continue
                
        negatives = []
        valid = ~np.isnan(elev_data) & ~np.isnan(slope_data)
        valid_rows, valid_cols = np.where(valid)
        np.random.seed(42) 
        num_negatives = min(len(positives) * 5, 100) 
        indices = np.random.choice(len(valid_rows), num_negatives * 2, replace=False) 
        
        for idx in indices:
            r, c = valid_rows[idx], valid_cols[idx]
            if (r, c) not in positive_coords:
                lon, lat = src_elev.xy(r, c)
                spatial_group = f"{int(np.floor(lat))}_{int(np.floor(lon))}"
                negatives.append({'latitude': lat, 'longitude': lon, 'elevation': float(elev_data[r, c]), 'slope': float(slope_data[r, c]), 'aspect': float(aspect_data[r, c]), 'label': 0, 'spatial_group': spatial_group})
                if len(negatives) >= num_negatives: break

    from app.ml.weather import get_historical_rainfall
    from app.ml.satellite import get_sentinel1_backscatter
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    combined_samples = positives + negatives
    print(f"Fetching historical rainfall & Sentinel-1 SAR for {len(combined_samples)} locations...")
    
    def fetch_apis_for_sample(sample):
        date_str = sample.get("date", "2023/07/15 00:00:00+00") if sample['label'] == 1 else "2023/07/15 00:00:00+00"
        sample['rainfall_7d_mm'] = get_historical_rainfall(sample['latitude'], sample['longitude'], date_str)
        
        # Satellite SAR
        sar_data = get_sentinel1_backscatter(sample['latitude'], sample['longitude'], date_str)
        sample['sar_vv'] = sar_data.get('sar_vv', 0.0)
        sample['sar_vh'] = sar_data.get('sar_vh', 0.0)
        
        return sample
        
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(fetch_apis_for_sample, s): s for s in combined_samples}
        completed = []
        done_count = 0
        total_count = len(futures)
        for future in as_completed(futures):
            completed.append(future.result())
            done_count += 1
            if done_count % 25 == 0 or done_count == total_count:
                print(f"Processed {done_count}/{total_count} samples ({done_count*100//total_count}%)")
            
    df = pd.DataFrame(completed)
    out_csv = DATA_DIR / "training_dataset.csv"
    df.to_csv(out_csv, index=False)
    print(f"\n--- DATASET SUMMARY ---")
    print(f"Total Positives extracted: {len(positives)}")
    print(f"Total Background (Negatives): {len(negatives)}")
    print(f"Saved dataset with {len(df)} samples and features: {list(df.columns)}")

if __name__ == "__main__": build_dataset()
