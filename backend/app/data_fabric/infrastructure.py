import json
import numpy as np
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime, timezone
from app.config import DATA_DIR
from app.data_fabric.base import BaseProvider, ProviderStatus

class InfrastructureProvider(BaseProvider):
    """
    Survey of India / OSM National Highways, district roads, and settlement gazetteer provider.
    """
    def __init__(self):
        super().__init__(name="Survey of India / OSM Infrastructure", source_type="Vector Transport Network")
        self.places_file = DATA_DIR / "infrastructure" / "ner_places.geojson"
        self.roads_file = DATA_DIR / "infrastructure" / "ner_roads.geojson"
        self._places_coords = []
        self._highways = []
        self._load_data()

    def _load_data(self):
        if self.places_file.exists():
            try:
                with open(self.places_file, 'r') as f:
                    data = json.load(f)
                for feat in data.get("features", []):
                    c = feat.get("geometry", {}).get("coordinates", [])
                    props = feat.get("properties", {})
                    if len(c) >= 2:
                        self._places_coords.append((c[1], c[0], props.get("name", "Settlement"), props.get("state", "NER")))
            except Exception:
                pass

        if self.roads_file.exists():
            try:
                with open(self.roads_file, 'r') as f:
                    self._highways = json.load(f).get("features", [])
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
        if not self._places_coords:
            self._load_data()

        min_place_dist = float('inf')
        nearest_town = "Shillong"
        nearest_state = "Meghalaya"
        for p_lat, p_lon, p_name, p_state in self._places_coords:
            d = self.haversine_km(lat, lon, p_lat, p_lon)
            if d < min_place_dist:
                min_place_dist = d
                nearest_town = p_name
                nearest_state = p_state

        min_road_dist = float('inf')
        nearest_hw = "National Highway Corridor"
        for hw in self._highways:
            pts = hw.get("geometry", {}).get("coordinates", [])
            name = hw.get("properties", {}).get("name", "National Highway")
            for pt in pts:
                if len(pt) >= 2:
                    d = self.haversine_km(lat, lon, pt[1], pt[0])
                    if d < min_road_dist:
                        min_road_dist = d
                        nearest_hw = name

        self.status = ProviderStatus.AVAILABLE
        return {
            "nearest_settlement": nearest_town,
            "settlement_state": nearest_state,
            "distance_to_settlement_km": min_place_dist,
            "nearest_highway": nearest_hw,
            "distance_to_highway_km": min_road_dist,
            "dist_to_infrastructure_km": min(min_place_dist, min_road_dist)
        }

    def validate(self, raw_data: Dict[str, Any]) -> bool:
        return bool(raw_data and "dist_to_infrastructure_km" in raw_data)

    def normalize(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "nearest_settlement": raw_data.get("nearest_settlement"),
            "settlement_state": raw_data.get("settlement_state"),
            "distance_to_settlement_km": round(float(raw_data.get("distance_to_settlement_km", 15.0)), 2),
            "nearest_highway": raw_data.get("nearest_highway"),
            "distance_to_highway_km": round(float(raw_data.get("distance_to_highway_km", 15.0)), 2),
            "distance_to_infrastructure_km": round(float(raw_data.get("dist_to_infrastructure_km", 15.0)), 2),
            "status": self.status,
            "provider": self.name
        }

    def metadata(self) -> Dict[str, Any]:
        return {
            "dataset": "Survey of India / OSM Infrastructure & Settlements",
            "places_count": len(self._places_coords),
            "highways_count": len(self._highways),
            "license": "ODbL / Open Government Data",
            "status": self.status
        }
