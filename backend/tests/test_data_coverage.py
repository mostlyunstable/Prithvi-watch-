import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ingestion.data_inventory import data_inventory, NER_STATE_DEFINITIONS
from app.ingestion.download_manager import DownloadManager

client = TestClient(app)

class TestDataInventoryAndCoverage:
    def test_state_definitions_completeness(self):
        assert len(NER_STATE_DEFINITIONS) == 8
        for state, defn in NER_STATE_DEFINITIONS.items():
            assert "code" in defn
            assert "capital" in defn
            assert "area_sq_km" in defn
            assert "bbox" in defn
            assert defn["area_sq_km"] > 0
            assert defn["bbox"]["min_lat"] < defn["bbox"]["max_lat"]
            assert defn["bbox"]["min_lon"] < defn["bbox"]["max_lon"]

    def test_calculate_state_coverage(self):
        cov = data_inventory.calculate_state_coverage()
        assert cov["states_count"] == 8
        assert 0.0 <= cov["overall_dem_coverage_pct"] <= 100.0
        assert cov["overall_weather_coverage_pct"] == 100.0
        assert cov["total_historical_landslides"] == 969
        assert len(cov["states"]) == 8

        for st, metrics in cov["states"].items():
            assert 0.0 <= metrics["dem_coverage_pct"] <= 100.0
            assert 0.0 <= metrics["rainfall_coverage_pct"] <= 100.0
            assert 0.0 <= metrics["sar_coverage_pct"] <= 100.0
            assert metrics["historical_landslides"] >= 0
            assert metrics["status"] in ("OPERATIONAL", "PARTIAL_RASTER")

    def test_sources_metadata_generation(self):
        sources = data_inventory.generate_sources_metadata()
        assert "datasets" in sources
        assert len(sources["datasets"]) >= 5
        ids = [d["id"] for d in sources["datasets"]]
        assert "NASA_SRTM_30M" in ids
        assert "NASA_GLC_COOLR" in ids
        assert "OPEN_METEO_ERA5" in ids
        assert "COPERNICUS_SENTINEL_1" in ids

    def test_acquisitions_metadata_generation(self):
        acqs = data_inventory.generate_acquisitions_metadata()
        assert "satellite_sar" in acqs
        assert "weather_reanalysis" in acqs
        assert len(acqs["satellite_sar"]["latest_acquisitions"]) > 0

class TestDataCoverageEndpoints:
    def test_get_data_coverage_endpoint(self):
        response = client.get("/api/data/coverage")
        assert response.status_code == 200
        data = response.json()
        assert "overall_dem_coverage_pct" in data
        assert "states" in data
        assert len(data["states"]) == 8

    def test_get_data_inventory_endpoint(self):
        response = client.get("/api/data/inventory")
        assert response.status_code == 200
        data = response.json()
        assert "datasets" in data
        assert len(data["datasets"]) >= 5

    def test_get_data_acquisitions_endpoint(self):
        response = client.get("/api/data/acquisitions")
        assert response.status_code == 200
        data = response.json()
        assert "satellite_sar" in data

    def test_prediction_includes_data_completeness(self):
        response = client.post("/api/predictions/run", json={"latitude": 25.5788, "longitude": 91.8933, "scenario": "A"})
        assert response.status_code == 200
        data = response.json()
        assert "data_quality" in data
        assert "completeness" in data["data_quality"]
        comp = data["data_quality"]["completeness"]
        assert comp["sources_available"] == 5
        assert comp["sources_total"] == 5
        assert comp["completeness_pct"] == 100.0

class TestDownloadManagerResilience:
    def test_download_manager_init_and_sha256(self):
        dm = DownloadManager(max_retries=2, timeout_seconds=5.0)
        dem_file = "data/dem/real_dem.tif"
        hash_val = dm.compute_sha256(dem_file)
        assert len(hash_val) == 64
