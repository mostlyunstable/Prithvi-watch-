import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.data_fabric.registry import data_fabric

client = TestClient(app)

class TestDataFabricProviders(unittest.TestCase):
    def test_topography_provider_shillong(self):
        res = data_fabric.topography.fetch(25.5788, 91.8933)
        self.assertIn("elevation", res)
        self.assertIn("slope", res)
        self.assertIn("tri", res)
        norm = data_fabric.topography.normalize(res)
        self.assertGreater(norm["elevation"], 0)
        self.assertTrue(0 <= norm["slope"] <= 90)

    def test_hydrology_provider(self):
        res = data_fabric.hydrology.fetch(25.5788, 91.8933)
        self.assertIn("nearest_river_name", res)
        self.assertIn("nearest_river_distance_km", res)
        norm = data_fabric.hydrology.normalize(res)
        self.assertGreater(norm["distance_km"], 0)

    def test_precipitation_provider(self):
        res = data_fabric.precipitation.fetch(25.5788, 91.8933)
        self.assertIn("rainfall_7d_mm", res)
        self.assertIn("rainfall_30d_mm", res)
        self.assertIn("rainfall_anomaly_pct", res)
        norm = data_fabric.precipitation.normalize(res)
        self.assertTrue(norm["rainfall_7d_mm"] >= 0)

    def test_sar_provider(self):
        res = data_fabric.sar.fetch(25.5788, 91.8933)
        self.assertIn("sar_vv", res)
        self.assertIn("sar_vh", res)
        self.assertIn("sar_ratio", res)

    def test_optical_provider(self):
        res = data_fabric.optical.fetch(25.5788, 91.8933)
        self.assertIn("ndvi", res)
        self.assertTrue(-1.0 <= res["ndvi"] <= 1.0)

    def test_landcover_provider(self):
        res = data_fabric.landcover.fetch(25.5788, 91.8933, elevation=1500.0, dist_to_infrastructure_km=5.0)
        self.assertIn("class_code", res)
        self.assertIn("class_label", res)

    def test_infrastructure_provider(self):
        res = data_fabric.infrastructure.fetch(25.5788, 91.8933)
        self.assertIn("nearest_settlement", res)
        self.assertIn("nearest_highway", res)
        self.assertIn("dist_to_infrastructure_km", res)

    def test_historical_hazards_provider(self):
        res = data_fabric.hazards.fetch(25.5788, 91.8933)
        self.assertIn("historical_landslides_within_25km", res)

class TestDataFabricEndpoints(unittest.TestCase):
    def test_fabric_catalog_endpoint(self):
        resp = client.get("/api/fabric/catalog")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["total_providers"], 8)
        self.assertEqual(data["fabric_status"], "OPERATIONAL")

    def test_fabric_enrich_endpoint(self):
        resp = client.get("/api/fabric/enrich?lat=25.5788&lon=91.8933")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["latitude"], 25.5788)
        self.assertEqual(data["longitude"], 91.8933)
        self.assertIn("topography", data)
        self.assertIn("hydrology", data)
        self.assertIn("precipitation", data)
        self.assertIn("satellite_sar", data)
        self.assertIn("satellite_optical", data)
        self.assertIn("land_cover", data)
        self.assertIn("infrastructure", data)
        self.assertIn("historical_hazards", data)
        self.assertIn("fabric_health", data)
        self.assertEqual(data["fabric_health"]["total_providers"], 8)

    def test_fabric_layers_endpoints(self):
        for endpoint, key in [
            ("/api/fabric/layers/rivers", "name"),
            ("/api/fabric/layers/basins", "name"),
            ("/api/fabric/layers/floods", "location_name"),
            ("/api/fabric/layers/roads", "name"),
        ]:
            resp = client.get(endpoint)
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertEqual(data["type"], "FeatureCollection")
            self.assertGreater(len(data["features"]), 0)
            self.assertIn(key, data["features"][0]["properties"])
