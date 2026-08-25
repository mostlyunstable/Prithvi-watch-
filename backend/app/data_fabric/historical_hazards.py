import json
import numpy as np
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime, timezone
from app.config import DATA_DIR
from app.data_fabric.base import BaseProvider, ProviderStatus

class HistoricalHazardsProvider(BaseProvider):
    """
    Queries verified NASA GLC landslide records and CWC / ASDMA historical flood occurrences.
    Computes nearest hazard events within regional radius.
    """
    def __init__(self):
        super().__init__(name="NASA GLC & CWC/ASDMA Historical Disaster Catalogs", source_type="Verified Hazard Inventories")
        self.landslides_file = DATA_DIR / "landslides" / "real_historical.geojson"
        self.floods_file = DATA_DIR / "floods" / "ner_historical_floods.geojson"
        self._landslides = []
        self._floods = []
        self._load_data()

    def _load_data(self):
        if self.landslides_file.exists():
            try:
                with open(self.landslides_file, 'r') as f:
                    self._landslides = json.load(f).get("features", [])
            except Exception:
                pass

        if self.floods_file.exists():
            try:
                with open(self.floods_file, 'r') as f:
                    self._floods = json.load(f).get("features", [])
            except Exception:
                pass

    def haversine_km(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        r = 6371.0
        dlat = np.radians(lat2 - lat1)
        dlon = np.radians(lon2 - lon1)
        a = np.sin(dlat/2.0)**2 + np.cos(np.radians(lat1))*np.cos(np.radians(lat2))*np.sin(dlon/2.0)**2
        return float(r * 2.0 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a)))

    def fetch(self, lat: float, lon: float, **kwargs) -> Dict[str, Any]:
        self.last_checked = datetime.now(timezone.utc)
        if not self._landslides:
            self._load_data()

        # Find nearest historical landslide within 50 km
        min_ls_dist = float('inf')
        nearest_ls = None
        nearby_ls_count_25km = 0

        for ls in self._landslides:
            c = ls.get("geometry", {}).get("coordinates", [])
            if len(c) >= 2:
                d = self.haversine_km(lat, lon, c[1], c[0])
                if d <= 25.0:
                    nearby_ls_count_25km += 1
                if d < min_ls_dist:
                    min_ls_dist = d
                    nearest_ls = ls.get("properties", {})

        # Find nearest historical flood event within 100 km
        min_fl_dist = float('inf')
        nearest_fl = None
        for fl in self._floods:
            c = fl.get("geometry", {}).get("coordinates", [])
            if len(c) >= 2:
                d = self.haversine_km(lat, lon, c[1], c[0])
                if d < min_fl_dist:
                    min_fl_dist = d
                    nearest_fl = fl.get("properties", {})

        self.status = ProviderStatus.AVAILABLE
        return {
            "nearest_landslide_distance_km": min_ls_dist if nearest_ls else None,
            "nearest_landslide_date": nearest_ls.get("event_date") if nearest_ls else None,
            "nearest_landslide_location": nearest_ls.get("location_description") if nearest_ls else None,
            "historical_landslides_within_25km": nearby_ls_count_25km,
            "nearest_flood_distance_km": min_fl_dist if nearest_fl else None,
            "nearest_flood_location": nearest_fl.get("location_name") if nearest_fl else None,
            "nearest_flood_year": nearest_fl.get("year") if nearest_fl else None,
            "nearest_flood_severity": nearest_fl.get("severity") if nearest_fl else None
        }

    def validate(self, raw_data: Dict[str, Any]) -> bool:
        return raw_data is not None

    def normalize(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "nearest_landslide": {
                "distance_km": round(float(raw_data["nearest_landslide_distance_km"]), 2) if raw_data.get("nearest_landslide_distance_km") is not None else None,
                "date": raw_data.get("nearest_landslide_date"),
                "location": raw_data.get("nearest_landslide_location"),
                "events_within_25km": raw_data.get("historical_landslides_within_25km", 0)
            },
            "nearest_flood": {
                "distance_km": round(float(raw_data["nearest_flood_distance_km"]), 2) if raw_data.get("nearest_flood_distance_km") is not None else None,
                "location": raw_data.get("nearest_flood_location"),
                "year": raw_data.get("nearest_flood_year"),
                "severity": raw_data.get("nearest_flood_severity")
            },
            "status": self.status,
            "provider": self.name
        }

    def metadata(self) -> Dict[str, Any]:
        return {
            "dataset": "NASA GLC Landslides & CWC/ASDMA Flood Inventory",
            "landslides_count": len(self._landslides),
            "floods_count": len(self._floods),
            "license": "NASA Open Data / OGD India",
            "status": self.status
        }
