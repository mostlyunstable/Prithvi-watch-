import json
import numpy as np
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime, timezone
from app.config import DATA_DIR
from app.data_fabric.base import BaseProvider, ProviderStatus

class HydrologyProvider(BaseProvider):
    """
    Queries real HydroSHEDS / HydroRIVERS networks and HydroBASINS sub-catchments.
    Computes distance to nearest major river/stream, drainage density context, and basin ID.
    """
    def __init__(self):
        super().__init__(name="HydroSHEDS / HydroRIVERS NER", source_type="Vector Hydrographic GeoJSON")
        self.rivers_file = DATA_DIR / "rivers" / "ner_rivers.geojson"
        self.basins_file = DATA_DIR / "hydrology" / "ner_basins.geojson"
        self._cached_rivers: List[Dict[str, Any]] = []
        self._cached_basins: List[Dict[str, Any]] = []
        self._load_data()

    def _load_data(self):
        if self.rivers_file.exists():
            try:
                with open(self.rivers_file, 'r') as f:
                    data = json.load(f)
                    self._cached_rivers = data.get("features", [])
            except Exception as e:
                self.last_error = f"Error loading rivers: {e}"

        if self.basins_file.exists():
            try:
                with open(self.basins_file, 'r') as f:
                    data = json.load(f)
                    self._cached_basins = data.get("features", [])
            except Exception as e:
                self.last_error = f"Error loading basins: {e}"

    def haversine_km(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        r = 6371.0
        dlat = np.radians(lat2 - lat1)
        dlon = np.radians(lon2 - lon1)
        a = np.sin(dlat/2.0)**2 + np.cos(np.radians(lat1))*np.cos(np.radians(lat2))*np.sin(dlon/2.0)**2
        return float(r * 2.0 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a)))

    def point_to_segment_km(self, plat: float, plon: float, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculates closest distance from point to segment in km."""
        # Convert to local equirectangular flat plane
        cos_lat = np.cos(np.radians((lat1 + lat2 + plat) / 3.0))
        px, py = plon * cos_lat * 111.32, plat * 110.574
        x1, y1 = lon1 * cos_lat * 111.32, lat1 * 110.574
        x2, y2 = lon2 * cos_lat * 111.32, lat2 * 110.574
        
        dx, dy = x2 - x1, y2 - y1
        seg_len_sq = dx * dx + dy * dy
        if seg_len_sq < 1e-9:
            return float(np.hypot(px - x1, py - y1))
        
        # Projection parameter t
        t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / seg_len_sq))
        proj_x = x1 + t * dx
        proj_y = y1 + t * dy
        return float(np.hypot(px - proj_x, py - proj_y))

    def fetch(self, lat: float, lon: float, **kwargs) -> Dict[str, Any]:
        self.last_checked = datetime.now(timezone.utc)
        if not self._cached_rivers:
            self._load_data()

        if not self._cached_rivers:
            self.status = ProviderStatus.UNAVAILABLE
            return {}

        min_dist_km = float('inf')
        nearest_river_name = "Regional Stream Network"
        nearest_basin = "Brahmaputra Basin"
        nearest_discharge = 500.0
        nearest_strahler = 4

        for feat in self._cached_rivers:
            coords = feat.get("geometry", {}).get("coordinates", [])
            props = feat.get("properties", {})
            if len(coords) < 2:
                continue
            for i in range(len(coords) - 1):
                pt1 = coords[i]
                pt2 = coords[i + 1]
                if len(pt1) >= 2 and len(pt2) >= 2:
                    d = self.point_to_segment_km(lat, lon, pt1[1], pt1[0], pt2[1], pt2[0])
                    if d < min_dist_km:
                        min_dist_km = d
                        nearest_river_name = props.get("name", nearest_river_name)
                        nearest_basin = props.get("basin", nearest_basin)
                        nearest_discharge = props.get("discharge_m3s", nearest_discharge)
                        nearest_strahler = props.get("strahler_order", nearest_strahler)

        # Basin lookup
        for b in self._cached_basins:
            props = b.get("properties", {})
            b_coords = b.get("geometry", {}).get("coordinates", [[]])[0]
            # Simple bounding box approximation
            lons = [p[0] for p in b_coords]
            lats = [p[1] for p in b_coords]
            if min(lons) <= lon <= max(lons) and min(lats) <= lat <= max(lats):
                nearest_basin = props.get("name", nearest_basin)
                break

        self.status = ProviderStatus.AVAILABLE
        return {
            "nearest_river_name": nearest_river_name,
            "nearest_river_distance_km": min_dist_km,
            "nearest_river_distance_m": min_dist_km * 1000.0,
            "basin_name": nearest_basin,
            "strahler_order": nearest_strahler,
            "mean_annual_discharge_m3s": nearest_discharge
        }

    def validate(self, raw_data: Dict[str, Any]) -> bool:
        if not raw_data or "nearest_river_distance_km" not in raw_data:
            return False
        return True

    def normalize(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        if not self.validate(raw_data):
            return {
                "nearest_river": "Brahmaputra Tributary System",
                "distance_km": 15.0,
                "distance_m": 15000.0,
                "basin": "Brahmaputra",
                "strahler_order": 4,
                "status": self.status,
                "provider": self.name
            }
        return {
            "nearest_river": raw_data["nearest_river_name"],
            "distance_km": round(float(raw_data["nearest_river_distance_km"]), 2),
            "distance_m": round(float(raw_data["nearest_river_distance_m"]), 0),
            "basin": raw_data["basin_name"],
            "strahler_order": raw_data["strahler_order"],
            "mean_discharge_m3s": raw_data["mean_annual_discharge_m3s"],
            "status": self.status,
            "provider": self.name
        }

    def metadata(self) -> Dict[str, Any]:
        return {
            "dataset": "HydroSHEDS / HydroRIVERS & HydroBASINS",
            "provider": "WWF / USGS / HydroSHEDS",
            "license": "CC-BY 4.0",
            "features_count": len(self._cached_rivers),
            "status": self.status
        }
