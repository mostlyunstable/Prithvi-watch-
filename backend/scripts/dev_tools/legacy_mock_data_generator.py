import os
import json
import numpy as np
import rasterio
from rasterio.transform import from_origin
from pathlib import Path
import geopandas as gpd
from shapely.geometry import Point

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"

def generate_dem():
    print("Generating mock DEM...")
    dem_dir = DATA_DIR / "dem"
    dem_dir.mkdir(parents=True, exist_ok=True)
    
    # 100x100 grid covering NER bounding box roughly (89.8 to 97.4 lon, 21.9 to 29.5 lat)
    width = 100
    height = 100
    res_x = (97.4 - 89.8) / width
    res_y = (29.5 - 21.9) / height
    
    transform = from_origin(89.8, 29.5, res_x, res_y)
    
    # Generate some perlin-like noise or just random for elevation
    elevation = np.random.uniform(100, 3000, (height, width)).astype(np.float32)
    
    with rasterio.open(
        dem_dir / "ner_dem.tif", 'w', driver='GTiff',
        height=height, width=width,
        count=1, dtype=elevation.dtype,
        crs='+proj=latlong',
        transform=transform,
    ) as dst:
        dst.write(elevation, 1)

def generate_landslides():
    print("Generating mock historical landslides...")
    ls_dir = DATA_DIR / "landslides"
    ls_dir.mkdir(parents=True, exist_ok=True)
    
    n_samples = 200
    lats = np.random.uniform(22.0, 29.0, n_samples)
    lons = np.random.uniform(90.0, 97.0, n_samples)
    
    features = []
    for i in range(n_samples):
        features.append({
            "type": "Feature",
            "properties": {
                "event_id": f"LS_{i}",
                "date": "2025-06-01",
                "severity": np.random.choice(["LOW", "MODERATE", "HIGH", "CRITICAL"])
            },
            "geometry": {
                "type": "Point",
                "coordinates": [lons[i], lats[i]]
            }
        })
        
    geojson = {"type": "FeatureCollection", "features": features}
    with open(ls_dir / "historical.geojson", "w") as f:
        json.dump(geojson, f, indent=2)

if __name__ == "__main__":
    generate_dem()
    generate_landslides()
    print("Mock data generation complete.")
