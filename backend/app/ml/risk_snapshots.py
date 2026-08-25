import numpy as np
import rasterio
import xgboost as xgb
import pandas as pd
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
from app.config import DATA_DIR, MODELS_DIR, VELOCITY_THRESHOLDS, VELOCITY_COLORS

MAX_GRID_CELLS = 10_000

@dataclass
class RiskSnapshot:
    id: str
    timestamp: str  # ISO UTC format
    grid_key: str
    lat: float
    lon: float
    risk_probability: float
    rainfall_7d_mm: float
    sar_vv: float
    sar_vh: float
    elevation: float
    slope: float
    data_quality: str  # "OPTIMAL" | "DEGRADED" | "UNAVAILABLE"
    model_version: str = "v1.0-xgb"

class RiskSnapshotStore:
    """
    Lightweight, thread-safe in-memory risk snapshot store for spatial assessment tracking.
    Retains time-ordered assessment histories per grid cell with deduplication and bound ceilings.
    """
    def __init__(self, max_history_per_cell: int = 20):
        self.max_history_per_cell = max_history_per_cell
        self._store: Dict[str, List[RiskSnapshot]] = {}

    def grid_key_for(self, lat: float, lon: float, resolution: float = 0.05) -> str:
        q_lat = round(round(lat / resolution) * resolution, 4)
        q_lon = round(round(lon / resolution) * resolution, 4)
        return f"{q_lat}_{q_lon}"

    def record_snapshot(
        self,
        lat: float,
        lon: float,
        risk_probability: float,
        rainfall_7d_mm: float = 35.0,
        sar_vv: float = 0.35,
        sar_vh: float = 0.08,
        elevation: float = 0.0,
        slope: float = 0.0,
        data_quality: str = "OPTIMAL",
        model_version: str = "v1.0-xgb",
        timestamp: Optional[datetime] = None
    ) -> RiskSnapshot:
        dt = timestamp or datetime.now(timezone.utc)
        iso_time = dt.isoformat()
        key = self.grid_key_for(lat, lon)
        
        snap_id = f"{key}_{int(dt.timestamp())}"
        snapshot = RiskSnapshot(
            id=snap_id,
            timestamp=iso_time,
            grid_key=key,
            lat=round(lat, 4),
            lon=round(lon, 4),
            risk_probability=round(float(risk_probability), 4),
            rainfall_7d_mm=round(float(rainfall_7d_mm), 2),
            sar_vv=round(float(sar_vv), 4),
            sar_vh=round(float(sar_vh), 4),
            elevation=round(float(elevation), 1),
            slope=round(float(slope), 1),
            data_quality=data_quality,
            model_version=model_version
        )

        if key not in self._store:
            self._store[key] = []

        history = self._store[key]
        
        # Deduplication: If latest snapshot exists within last 60 seconds with identical risk, don't duplicate
        if history:
            latest = history[-1]
            try:
                latest_dt = datetime.fromisoformat(latest.timestamp)
                if (dt - latest_dt).total_seconds() < 60 and abs(latest.risk_probability - snapshot.risk_probability) < 0.001:
                    return latest
            except Exception:
                pass

        history.append(snapshot)
        if len(history) > self.max_history_per_cell:
            history.pop(0)

        return snapshot

    def get_latest_and_previous(self, key: str) -> Tuple[Optional[RiskSnapshot], Optional[RiskSnapshot]]:
        history = self._store.get(key, [])
        if not history:
            return None, None
        if len(history) == 1:
            return history[-1], None
        return history[-1], history[-2]

    def get_timeline(self, lat: float, lon: float, limit: int = 5) -> List[Dict[str, Any]]:
        key = self.grid_key_for(lat, lon)
        history = self._store.get(key, [])
        return [asdict(s) for s in history[-limit:]]

    def clear(self):
        self._store.clear()

# Global Singleton Snapshot Store
snapshot_store = RiskSnapshotStore()

def classify_trend(delta: float) -> str:
    """
    Deterministic trend classification based on configured velocity thresholds.
    """
    if delta < VELOCITY_THRESHOLDS["RAPIDLY_DECREASING"]:
        return "RAPIDLY_DECREASING"
    elif delta < VELOCITY_THRESHOLDS["DECREASING_UPPER"]:
        return "DECREASING"
    elif delta <= VELOCITY_THRESHOLDS["STABLE_UPPER"]:
        return "STABLE"
    elif delta <= VELOCITY_THRESHOLDS["INCREASING_UPPER"]:
        return "INCREASING"
    else:
        return "RAPIDLY_INCREASING"

def calculate_velocity_properties(
    current: RiskSnapshot,
    previous: Optional[RiskSnapshot]
) -> Dict[str, Any]:
    """
    Calculates velocity metrics, risk delta, relative change, and primary environmental drivers.
    """
    if previous is None:
        return {
            "current_risk": current.risk_probability,
            "previous_risk": None,
            "risk_delta": None,
            "risk_delta_pct": None,
            "trend": "INSUFFICIENT_HISTORY",
            "confidence": "UNKNOWN" if current.data_quality == "UNAVAILABLE" else "REDUCED",
            "observation_age_hours": None,
            "fill": VELOCITY_COLORS["INSUFFICIENT_HISTORY"],
            "primary_driver": "No prior baseline observation recorded for this grid cell.",
            "data_quality": current.data_quality,
            "feature_deltas": {}
        }

    # Model Version Sanity Check
    if current.model_version != previous.model_version:
        return {
            "current_risk": current.risk_probability,
            "previous_risk": previous.risk_probability,
            "risk_delta": None,
            "risk_delta_pct": None,
            "trend": "INSUFFICIENT_HISTORY",
            "confidence": "REDUCED",
            "observation_age_hours": None,
            "fill": VELOCITY_COLORS["INSUFFICIENT_HISTORY"],
            "primary_driver": f"Model version change detected ({previous.model_version} -> {current.model_version}).",
            "data_quality": current.data_quality,
            "feature_deltas": {}
        }

    delta = round(current.risk_probability - previous.risk_probability, 4)
    if previous.risk_probability > 0:
        delta_pct = round((delta / previous.risk_probability) * 100.0, 1)
    else:
        delta_pct = 0.0

    try:
        cur_dt = datetime.fromisoformat(current.timestamp)
        prev_dt = datetime.fromisoformat(previous.timestamp)
        age_hours = round(max(0.1, (cur_dt - prev_dt).total_seconds() / 3600.0), 1)
    except Exception:
        age_hours = 1.0

    trend = classify_trend(delta)
    color = VELOCITY_COLORS.get(trend, VELOCITY_COLORS["STABLE"])

    # Sensor degradation propagates to reduced confidence
    if current.data_quality == "DEGRADED" or previous.data_quality == "DEGRADED":
        confidence = "REDUCED"
    elif current.data_quality == "UNAVAILABLE" or previous.data_quality == "UNAVAILABLE":
        confidence = "LOW"
    else:
        confidence = "HIGH"

    rain_delta = round(current.rainfall_7d_mm - previous.rainfall_7d_mm, 1)
    sar_delta = round(current.sar_vv - previous.sar_vv, 3)

    if abs(rain_delta) >= 20.0:
        driver = f"Rainfall accumulation shift ({'+' if rain_delta > 0 else ''}{rain_delta} mm)"
    elif abs(sar_delta) >= 0.08:
        driver = f"Radar backscatter / soil moisture shift ({'+' if sar_delta > 0 else ''}{sar_delta})"
    elif abs(delta) <= 0.05:
        driver = "Stable environmental baseline"
    else:
        driver = "Combined multimodal environmental variation"

    return {
        "current_risk": current.risk_probability,
        "previous_risk": previous.risk_probability,
        "risk_delta": delta,
        "risk_delta_pct": delta_pct,
        "trend": trend,
        "confidence": confidence,
        "observation_age_hours": age_hours,
        "fill": color,
        "primary_driver": driver,
        "data_quality": current.data_quality,
        "feature_deltas": {
            "rainfall_delta_mm": rain_delta,
            "sar_vv_delta": sar_delta
        }
    }

# Model cache for grid inference
_cached_xgb = None

def _get_xgb_model():
    global _cached_xgb
    if _cached_xgb is None:
        model_path = MODELS_DIR / "xgboost_model.json"
        if model_path.exists():
            _cached_xgb = xgb.XGBClassifier()
            _cached_xgb.load_model(model_path)
    return _cached_xgb

def generate_risk_velocity_geojson(
    min_lon: float,
    min_lat: float,
    max_lon: float,
    max_lat: float,
    resolution: float = 0.05,
    scenario: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generates a GeoJSON grid of Risk Velocity (Change) for the specified bounding box.
    Answers: 'Where is model-estimated landslide risk changing?'
    """
    # 1. Parameter Validation
    if np.isnan(resolution) or np.isinf(resolution) or resolution <= 0:
        raise ValueError(f"Invalid resolution: {resolution}. Resolution must be a positive float.")
    if resolution < 0.01 or resolution > 0.5:
        raise ValueError(f"Resolution {resolution} out of allowed bounds [0.01, 0.5].")

    if np.isnan(min_lon) or np.isnan(max_lon) or np.isnan(min_lat) or np.isnan(max_lat):
        raise ValueError("Coordinates must not be NaN.")
    if min_lon >= max_lon or min_lat >= max_lat:
        return {"type": "FeatureCollection", "features": []}

    num_lon = int(np.ceil((max_lon - min_lon) / resolution))
    num_lat = int(np.ceil((max_lat - min_lat) / resolution))
    estimated_cells = num_lon * num_lat

    if estimated_cells > MAX_GRID_CELLS:
        raise ValueError(
            f"Requested grid contains {estimated_cells} cells, exceeding maximum allowed ceiling of {MAX_GRID_CELLS}. "
            "Please narrow the bounding box or increase resolution."
        )

    model = _get_xgb_model()
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

    # Read raster grids once
    with rasterio.open(dem_path) as src_elev, rasterio.open(slope_path) as src_slope, rasterio.open(aspect_path) as src_aspect:
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

                    # Environmental baseline setup
                    if scenario == 'A':
                        rain = 35.0
                        sar = 0.35
                    elif scenario == 'B':
                        rain = 125.0
                        sar = 0.28
                    elif scenario == 'C':
                        rain = 245.0
                        sar = 0.20
                    else:
                        rain = 40.0
                        sar = 0.35

                    points_to_predict.append({
                        'elevation': elev,
                        'slope': slope,
                        'aspect': aspect,
                        'rainfall_7d_mm': rain,
                        'sar_vv': sar,
                        'sar_vh': 0.08
                    })
                    coords_list.append((lon, lat, elev, slope, rain, sar))
                except Exception:
                    continue

    if not points_to_predict:
        return {"type": "FeatureCollection", "features": []}

    # Vectorized batch evaluation
    df_batch = pd.DataFrame(points_to_predict)[['elevation', 'slope', 'aspect', 'rainfall_7d_mm', 'sar_vv', 'sar_vh']]
    probs = model.predict_proba(df_batch)[:, 1]

    now_utc = datetime.now(timezone.utc)

    for (lon, lat, elev, slope, rain, sar), prob in zip(coords_list, probs):
        p = float(prob)
        key = snapshot_store.grid_key_for(lat, lon, resolution)

        # In Demo Mode: generate deterministic baseline comparisons
        if scenario in ('A', 'B', 'C'):
            if scenario == 'A': # Stable baseline
                prev_p = p + 0.01
                prev_rain = rain - 5.0
                prev_sar = sar
            elif scenario == 'B': # Increasing
                prev_p = max(0.05, p - 0.11)
                prev_rain = 45.0
                prev_sar = 0.35
            else: # Scenario C: Rapidly increasing
                prev_p = max(0.05, p - 0.26)
                prev_rain = 30.0
                prev_sar = 0.38

            prev_snap = RiskSnapshot(
                id=f"{key}_demo_prev",
                timestamp=(now_utc - timedelta(hours=6)).isoformat(),
                grid_key=key,
                lat=lat,
                lon=lon,
                risk_probability=round(prev_p, 4),
                rainfall_7d_mm=prev_rain,
                sar_vv=prev_sar,
                sar_vh=0.08,
                elevation=elev,
                slope=slope,
                data_quality="OPTIMAL"
            )
            cur_snap = RiskSnapshot(
                id=f"{key}_demo_cur",
                timestamp=now_utc.isoformat(),
                grid_key=key,
                lat=lat,
                lon=lon,
                risk_probability=round(p, 4),
                rainfall_7d_mm=rain,
                sar_vv=sar,
                sar_vh=0.08,
                elevation=elev,
                slope=slope,
                data_quality="OPTIMAL"
            )
        else:
            # Real Data Mode: strictly read from snapshot store
            cur_snap = snapshot_store.record_snapshot(
                lat=lat,
                lon=lon,
                risk_probability=p,
                rainfall_7d_mm=rain,
                sar_vv=sar,
                sar_vh=0.08,
                elevation=elev,
                slope=slope,
                data_quality="OPTIMAL",
                timestamp=now_utc
            )
            _, prev_snap = snapshot_store.get_latest_and_previous(key)

        velocity_props = calculate_velocity_properties(cur_snap, prev_snap)
        velocity_props["elevation"] = round(elev, 1)
        velocity_props["slope"] = round(slope, 1)

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
            "properties": velocity_props
        }
        features_list.append(poly)

    return {
        "type": "FeatureCollection",
        "features": features_list
    }
