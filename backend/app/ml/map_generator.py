import numpy as np
import rasterio
import xgboost as xgb
import pandas as pd
from typing import Dict, Any
from app.config import DATA_DIR, MODELS_DIR

# Global model cache and GeoJSON memory cache
_cached_model = None
_geojson_cache: Dict[str, Dict[str, Any]] = {}
MAX_GEOJSON_CACHE_SIZE = 100
MAX_GRID_CELLS = 10_000

def _get_model():
    global _cached_model
    if _cached_model is None:
        model_path = MODELS_DIR / "xgboost_model.json"
        if model_path.exists():
            _cached_model = xgb.XGBClassifier()
            _cached_model.load_model(model_path)
    return _cached_model

def generate_risk_geojson(min_lon: float, min_lat: float, max_lon: float, max_lat: float, resolution: float = 0.05) -> Dict[str, Any]:
    """
    Generates a GeoJSON grid of risk probabilities for the specified bounding box.
    Optimized with in-memory caching and sub-second vectorized inference.
    """
    # Check in-memory BBox cache
    cache_key = f"{round(min_lon, 3)}_{round(min_lat, 3)}_{round(max_lon, 3)}_{round(max_lat, 3)}_{round(resolution, 4)}"
    if cache_key in _geojson_cache:
        return _geojson_cache[cache_key]
    # 1. Parameter Validation
    if np.isnan(resolution) or np.isinf(resolution) or resolution <= 0:
        raise ValueError(f"Invalid resolution: {resolution}. Resolution must be a positive float.")
    if resolution < 0.01 or resolution > 0.5:
        raise ValueError(f"Resolution {resolution} out of allowed bounds [0.01, 0.5].")

    if np.isnan(min_lon) or np.isnan(max_lon) or np.isnan(min_lat) or np.isnan(max_lat):
        raise ValueError("Coordinates must not be NaN.")
    if min_lon >= max_lon or min_lat >= max_lat:
        return {"type": "FeatureCollection", "features": []}

    # Bounding box cell count calculation
    num_lon = int(np.ceil((max_lon - min_lon) / resolution))
    num_lat = int(np.ceil((max_lat - min_lat) / resolution))
    estimated_cells = num_lon * num_lat

    if estimated_cells > MAX_GRID_CELLS:
        raise ValueError(
            f"Requested grid contains {estimated_cells} cells, exceeding maximum allowed ceiling of {MAX_GRID_CELLS}. "
            "Please narrow the bounding box or increase resolution."
        )

    # 2. Check Models & Rasters
    model = _get_model()
    if model is None:
        return {"type": "FeatureCollection", "features": []}
        
    dem_path = DATA_DIR / "dem" / "real_dem.tif"
    slope_path = DATA_DIR / "dem" / "slope.tif"
    aspect_path = DATA_DIR / "dem" / "aspect.tif"
    
    if not dem_path.exists() or not slope_path.exists():
        return {"type": "FeatureCollection", "features": []}
        
    lons = np.arange(min_lon, max_lon, resolution)
    lats = np.arange(min_lat, max_lat, resolution)
    
    features_list = []
    points_to_predict = []
    coords_list = []
    
    with rasterio.open(dem_path) as src_elev, rasterio.open(slope_path) as src_slope, rasterio.open(aspect_path) as src_aspect:
        # Read raster bands once into memory
        elev_data = src_elev.read(1)
        slope_data = src_slope.read(1)
        aspect_data = src_aspect.read(1)
        bounds = src_elev.bounds
        
        for lon in lons:
            for lat in lats:
                if not (bounds.left <= lon <= bounds.right and bounds.bottom <= lat <= bounds.top):
                    continue
                try:
                    r, c = src_elev.index(lon, lat)
                    if r < 0 or r >= elev_data.shape[0] or c < 0 or c >= elev_data.shape[1]:
                        continue
                        
                    elev = float(elev_data[r, c])
                    slope = float(slope_data[r, c])
                    aspect = float(aspect_data[r, c])
                    
                    if np.isnan(elev) or np.isnan(slope) or elev < -100:
                        continue
                        
                    points_to_predict.append({
                        'elevation': elev,
                        'slope': slope,
                        'aspect': aspect,
                        'rainfall_7d_mm': 35.0, # regional monsoon baseline
                        'sar_vv': 0.35,         # neutral vegetation median
                        'sar_vh': 0.08
                    })
                    coords_list.append((lon, lat, elev, slope))
                except Exception:
                    continue
                    
    if not points_to_predict:
        return {"type": "FeatureCollection", "features": []}
        
    # Batch vectorized inference across all grid cells
    df_batch = pd.DataFrame(points_to_predict)[['elevation', 'slope', 'aspect', 'rainfall_7d_mm', 'sar_vv', 'sar_vh']]
    probs = model.predict_proba(df_batch)[:, 1]
    
    for (lon, lat, elev, slope), prob in zip(coords_list, probs):
        p = float(prob)
        if p >= 0.8:
            risk_level = "CRITICAL"
            color = "#ef4444"
        elif p >= 0.6:
            risk_level = "HIGH"
            color = "#fb923c"
        elif p >= 0.4:
            risk_level = "MODERATE"
            color = "#facc15"
        else:
            risk_level = "LOW"
            color = "#4ade80"
            
        poly = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [lon, lat],
                    [lon + resolution, lat],
                    [lon + resolution, lat + resolution],
                    [lon, lat + resolution],
                    [lon, lat]
                ]]
            },
            "properties": {
                "risk_probability": round(p, 4),
                "probability": round(p, 4),
                "landslide_probability": round(p, 4),
                "risk_level": risk_level,
                "fill": color,
                "elevation": round(elev, 1),
                "slope": round(slope, 1)
            }
        }
        features_list.append(poly)
        
    result = {
        "type": "FeatureCollection",
        "features": features_list
    }
    
    if len(_geojson_cache) >= MAX_GEOJSON_CACHE_SIZE:
        # Evict oldest entry
        first_key = next(iter(_geojson_cache))
        del _geojson_cache[first_key]
        
    _geojson_cache[cache_key] = result
    return result
