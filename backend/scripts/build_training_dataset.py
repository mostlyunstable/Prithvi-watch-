import os
import sys
import gzip
import urllib.request
import json
import pandas as pd
import rasterio
from rasterio.merge import merge
import numpy as np
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.ml.providers import get_historical_landslides
from app.ml.weather import get_historical_rainfall
from app.ml.satellite import get_sentinel1_backscatter

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
    except Exception as e:
        print("Failed loading historical landslides:", e)
        return
        
    lat_col = 'latitude' if 'latitude' in ls_df.columns else 'lat'
    lon_col = 'longitude' if 'longitude' in ls_df.columns else 'lon'
    
    ls_df['parsed_date'] = pd.to_datetime(ls_df['event_date'], errors='coerce')
    valid_coords = ls_df[
        ls_df[lat_col].notna() & ls_df[lon_col].notna() & (ls_df['parsed_date'].dt.year > 1980)
    ].drop_duplicates(subset=[lat_col, lon_col])
    
    places_file = DATA_DIR / "infrastructure" / "ner_places.geojson"
    places_coords = []
    if places_file.exists():
        with open(places_file, 'r') as f:
            p_data = json.load(f)
        for feat in p_data.get('features', []):
            coords = feat.get('geometry', {}).get('coordinates', [])
            if len(coords) >= 2:
                places_coords.append((coords[1], coords[0]))

    def haversine_km(lat1, lon1, lat2, lon2):
        r = 6371.0
        dlat = np.radians(lat2 - lat1)
        dlon = np.radians(lon2 - lon1)
        a = np.sin(dlat/2.0)**2 + np.cos(np.radians(lat1))*np.cos(np.radians(lat2))*np.sin(dlon/2.0)**2
        return r * 2.0 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a))

    def compute_windowed_morphology(win, res_x_m):
        if win.shape == (5, 5) and not np.isnan(win).any():
            center_z = win[2, 2]
            win3 = win[1:4, 1:4]
            tri_val = np.sqrt(np.sum((win3 - center_z)**2) / 8.0)
            relief_val = np.max(win) - np.min(win)
            
            z1, z2, z3 = win3[0, 0], win3[0, 1], win3[0, 2]
            z4, z5, z6 = win3[1, 0], win3[1, 1], win3[1, 2]
            z7, z8, z9 = win3[2, 0], win3[2, 1], win3[2, 2]
            L = res_x_m
            D = ((z4 + z6) / 2.0 - z5) / (L**2)
            E = ((z2 + z8) / 2.0 - z5) / (L**2)
            F = (-z1 + z3 + z7 - z9) / (4.0 * (L**2))
            G = (-z4 + z6) / (2.0 * L)
            H = (z2 - z8) / (2.0 * L)
            p = G**2 + H**2
            plan_c = 2.0 * (D * (H**2) + E * (G**2) - F * G * H) / (p**1.5) if p > 1e-10 else 0.0
            return round(float(tri_val), 2), round(float(relief_val), 1), round(float(plan_c * 100.0), 4)
        return 0.0, 0.0, 0.0

    positives, positive_coords = [], set()
    spatial_group_dates = {}
    all_positive_dates = []
    
    with rasterio.open(dem_path) as src_elev, rasterio.open(slope_path) as src_slope, rasterio.open(aspect_path) as src_aspect:
        dem_bounds = src_elev.bounds
        elev_data = src_elev.read(1)
        slope_data = src_slope.read(1)
        aspect_data = src_aspect.read(1)
        
        mean_lat = (src_elev.bounds.bottom + src_elev.bounds.top) / 2.0
        res_x_m = src_elev.res[0] * 111319.5 * np.cos(np.radians(mean_lat))

        for idx, row in valid_coords.iterrows():
            lon, lat = float(row[lon_col]), float(row[lat_col])
            if not (dem_bounds.left <= lon <= dem_bounds.right and dem_bounds.bottom <= lat <= dem_bounds.top):
                continue
            try:
                r, c = src_elev.index(lon, lat)
                elev = float(elev_data[r, c])
                slope = float(slope_data[r, c])
                aspect = float(aspect_data[r, c])
                if np.isnan(elev) or np.isnan(slope) or elev < -50:
                    continue
                    
                w = rasterio.windows.Window(max(0, c - 2), max(0, r - 2), 5, 5)
                win = src_elev.read(1, window=w).astype(float)
                win[win == src_elev.nodata] = np.nan
                tri, relief, plan_c = compute_windowed_morphology(win, res_x_m)
                dist_infra = min([haversine_km(lat, lon, p[0], p[1]) for p in places_coords]) if places_coords else 10.0

                spatial_group = f"{int(np.floor(lat))}_{int(np.floor(lon))}"
                date_val = str(row['event_date'])
                
                positives.append({
                    'latitude': round(lat, 4),
                    'longitude': round(lon, 4),
                    'elevation': round(elev, 1),
                    'slope': round(slope, 1),
                    'aspect': round(aspect, 1),
                    'tri': tri,
                    'relief_5x5': relief,
                    'plan_curvature': plan_c,
                    'dist_to_infrastructure_km': round(float(dist_infra), 2),
                    'label': 1,
                    'spatial_group': spatial_group,
                    'date': date_val
                })
                positive_coords.add((r, c))
                all_positive_dates.append(date_val)
                
                if spatial_group not in spatial_group_dates:
                    spatial_group_dates[spatial_group] = []
                spatial_group_dates[spatial_group].append(date_val)
            except Exception:
                continue
                
        negatives = []
        valid = ~np.isnan(elev_data) & ~np.isnan(slope_data) & (elev_data > -50)
        valid_rows, valid_cols = np.where(valid)
        
        rng = np.random.RandomState(42)
        num_negatives = len(positives)
        indices = rng.choice(len(valid_rows), num_negatives * 3, replace=False)
        
        for idx in indices:
            r, c = valid_rows[idx], valid_cols[idx]
            if (r, c) not in positive_coords:
                lon, lat = src_elev.xy(r, c)
                spatial_group = f"{int(np.floor(lat))}_{int(np.floor(lon))}"
                
                w = rasterio.windows.Window(max(0, c - 2), max(0, r - 2), 5, 5)
                win = src_elev.read(1, window=w).astype(float)
                win[win == src_elev.nodata] = np.nan
                tri, relief, plan_c = compute_windowed_morphology(win, res_x_m)
                dist_infra = min([haversine_km(lat, lon, p[0], p[1]) for p in places_coords]) if places_coords else 25.0

                if spatial_group in spatial_group_dates and len(spatial_group_dates[spatial_group]) > 0:
                    ref_date = rng.choice(spatial_group_dates[spatial_group])
                else:
                    ref_date = rng.choice(all_positive_dates)
                    
                negatives.append({
                    'latitude': round(lat, 4),
                    'longitude': round(lon, 4),
                    'elevation': round(float(elev_data[r, c]), 1),
                    'slope': round(float(slope_data[r, c]), 1),
                    'aspect': round(float(aspect_data[r, c]), 1),
                    'tri': tri,
                    'relief_5x5': relief,
                    'plan_curvature': plan_c,
                    'dist_to_infrastructure_km': round(float(dist_infra), 2),
                    'label': 0,
                    'spatial_group': spatial_group,
                    'date': str(ref_date)
                })
                if len(negatives) >= num_negatives:
                    break

    combined_samples = positives + negatives
    print(f"Fetching temporally matched historical rainfall & Sentinel-1 SAR for {len(combined_samples)} samples...")
    print(f"Positives: {len(positives)} | Negatives: {len(negatives)}")
    
    def fetch_apis_for_sample(sample):
        date_str = sample["date"]
        sample['rainfall_7d_mm'] = get_historical_rainfall(sample['latitude'], sample['longitude'], date_str)
        sar_data = get_sentinel1_backscatter(sample['latitude'], sample['longitude'], date_str)
        sample['sar_vv'] = sar_data.get('sar_vv', 0.35)
        sample['sar_vh'] = sar_data.get('sar_vh', 0.08)
        sample['sar_available'] = 1 if sar_data.get('sar_available') else 0
        return sample
        
    with ThreadPoolExecutor(max_workers=16) as executor:
        futures = {executor.submit(fetch_apis_for_sample, s): s for s in combined_samples}
        completed = []
        done_count = 0
        total_count = len(futures)
        for future in as_completed(futures):
            completed.append(future.result())
            done_count += 1
            if done_count % 50 == 0 or done_count == total_count:
                print(f"Processed {done_count}/{total_count} samples ({done_count*100//total_count}%)")
            
    df = pd.DataFrame(completed)
    out_csv = DATA_DIR / "training_dataset.csv"
    df.to_csv(out_csv, index=False)
    print(f"Saved dataset with {len(df)} samples to {out_csv}")
    print(f"Features: {list(df.columns)}")

if __name__ == "__main__":
    build_dataset()
