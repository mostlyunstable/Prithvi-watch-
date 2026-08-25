import pytest
import numpy as np
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.ml.risk_snapshots import (
    RiskSnapshot,
    RiskSnapshotStore,
    calculate_velocity_properties,
    classify_trend,
    generate_risk_velocity_geojson,
    MAX_GRID_CELLS
)

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_store():
    store = RiskSnapshotStore()
    yield store
    store.clear()

class TestRiskVelocityCalculations:
    def test_first_observation_insufficient_history(self):
        store = RiskSnapshotStore()
        cur = store.record_snapshot(lat=25.57, lon=91.88, risk_probability=0.45)
        _, prev = store.get_latest_and_previous(store.grid_key_for(25.57, 91.88))
        props = calculate_velocity_properties(cur, prev)
        assert props["trend"] == "INSUFFICIENT_HISTORY"
        assert props["previous_risk"] is None
        assert props["risk_delta"] is None
        assert props["fill"] == "#64748b"

    def test_identical_observations_stable(self):
        t0 = datetime(2026, 8, 20, 0, 0, tzinfo=timezone.utc)
        t1 = datetime(2026, 8, 20, 6, 0, tzinfo=timezone.utc)
        prev = RiskSnapshot("1", t0.isoformat(), "k1", 25.5, 91.8, 0.40, 35.0, 0.35, 0.08, 800, 15, "OPTIMAL")
        cur = RiskSnapshot("2", t1.isoformat(), "k1", 25.5, 91.8, 0.40, 35.0, 0.35, 0.08, 800, 15, "OPTIMAL")
        props = calculate_velocity_properties(cur, prev)
        assert props["trend"] == "STABLE"
        assert props["risk_delta"] == 0.0
        assert props["risk_delta_pct"] == 0.0
        assert props["confidence"] == "HIGH"
        assert props["fill"] == "#94a3b8"

    def test_positive_10_delta_increasing(self):
        t0 = datetime(2026, 8, 20, 0, 0, tzinfo=timezone.utc)
        t1 = datetime(2026, 8, 20, 6, 0, tzinfo=timezone.utc)
        prev = RiskSnapshot("1", t0.isoformat(), "k1", 25.5, 91.8, 0.40, 35.0, 0.35, 0.08, 800, 15, "OPTIMAL")
        cur = RiskSnapshot("2", t1.isoformat(), "k1", 25.5, 91.8, 0.50, 95.0, 0.35, 0.08, 800, 15, "OPTIMAL")
        props = calculate_velocity_properties(cur, prev)
        assert props["trend"] == "INCREASING"
        assert props["risk_delta"] == 0.10
        assert props["risk_delta_pct"] == 25.0
        assert props["fill"] == "#f97316"

    def test_positive_20_delta_rapidly_increasing(self):
        t0 = datetime(2026, 8, 20, 0, 0, tzinfo=timezone.utc)
        t1 = datetime(2026, 8, 20, 6, 0, tzinfo=timezone.utc)
        prev = RiskSnapshot("1", t0.isoformat(), "k1", 25.5, 91.8, 0.40, 35.0, 0.35, 0.08, 800, 15, "OPTIMAL")
        cur = RiskSnapshot("2", t1.isoformat(), "k1", 25.5, 91.8, 0.60, 180.0, 0.35, 0.08, 800, 15, "OPTIMAL")
        props = calculate_velocity_properties(cur, prev)
        assert props["trend"] == "RAPIDLY_INCREASING"
        assert props["risk_delta"] == 0.20
        assert props["risk_delta_pct"] == 50.0
        assert props["fill"] == "#ef4444"

    def test_negative_10_delta_decreasing(self):
        t0 = datetime(2026, 8, 20, 0, 0, tzinfo=timezone.utc)
        t1 = datetime(2026, 8, 20, 6, 0, tzinfo=timezone.utc)
        prev = RiskSnapshot("1", t0.isoformat(), "k1", 25.5, 91.8, 0.60, 150.0, 0.35, 0.08, 800, 15, "OPTIMAL")
        cur = RiskSnapshot("2", t1.isoformat(), "k1", 25.5, 91.8, 0.50, 40.0, 0.35, 0.08, 800, 15, "OPTIMAL")
        props = calculate_velocity_properties(cur, prev)
        assert props["trend"] == "DECREASING"
        assert props["risk_delta"] == -0.10
        assert props["fill"] == "#4ade80"

    def test_negative_20_delta_rapidly_decreasing(self):
        t0 = datetime(2026, 8, 20, 0, 0, tzinfo=timezone.utc)
        t1 = datetime(2026, 8, 20, 6, 0, tzinfo=timezone.utc)
        prev = RiskSnapshot("1", t0.isoformat(), "k1", 25.5, 91.8, 0.70, 200.0, 0.35, 0.08, 800, 15, "OPTIMAL")
        cur = RiskSnapshot("2", t1.isoformat(), "k1", 25.5, 91.8, 0.50, 20.0, 0.35, 0.08, 800, 15, "OPTIMAL")
        props = calculate_velocity_properties(cur, prev)
        assert props["trend"] == "RAPIDLY_DECREASING"
        assert props["risk_delta"] == -0.20
        assert props["fill"] == "#15803d"

    def test_degraded_sensor_reduced_confidence(self):
        t0 = datetime(2026, 8, 20, 0, 0, tzinfo=timezone.utc)
        t1 = datetime(2026, 8, 20, 6, 0, tzinfo=timezone.utc)
        prev = RiskSnapshot("1", t0.isoformat(), "k1", 25.5, 91.8, 0.40, 35.0, 0.35, 0.08, 800, 15, "OPTIMAL")
        cur = RiskSnapshot("2", t1.isoformat(), "k1", 25.5, 91.8, 0.65, 120.0, 0.35, 0.08, 800, 15, "DEGRADED")
        props = calculate_velocity_properties(cur, prev)
        assert props["trend"] == "RAPIDLY_INCREASING"
        assert props["confidence"] == "REDUCED"

    def test_model_version_mismatch(self):
        t0 = datetime(2026, 8, 20, 0, 0, tzinfo=timezone.utc)
        t1 = datetime(2026, 8, 20, 6, 0, tzinfo=timezone.utc)
        prev = RiskSnapshot("1", t0.isoformat(), "k1", 25.5, 91.8, 0.40, 35.0, 0.35, 0.08, 800, 15, "OPTIMAL", model_version="v1.0")
        cur = RiskSnapshot("2", t1.isoformat(), "k1", 25.5, 91.8, 0.65, 120.0, 0.35, 0.08, 800, 15, "OPTIMAL", model_version="v2.0")
        props = calculate_velocity_properties(cur, prev)
        assert props["trend"] == "INSUFFICIENT_HISTORY"
        assert props["confidence"] == "REDUCED"

    def test_snapshot_deduplication(self):
        store = RiskSnapshotStore()
        t = datetime(2026, 8, 20, 12, 0, tzinfo=timezone.utc)
        s1 = store.record_snapshot(25.5, 91.8, 0.55, timestamp=t)
        # Record identical snapshot 10 seconds later
        s2 = store.record_snapshot(25.5, 91.8, 0.55, timestamp=t + timedelta(seconds=10))
        assert s1.id == s2.id
        history = store._store[store.grid_key_for(25.5, 91.8)]
        assert len(history) == 1

class TestRiskVelocityAPI:
    def test_risk_velocity_endpoint_success(self):
        response = client.get("/api/risk_velocity?min_lon=91.5&min_lat=25.5&max_lon=92.0&max_lat=26.0&resolution=0.05")
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) > 0
        feat = data["features"][0]
        assert "current_risk" in feat["properties"]
        assert "trend" in feat["properties"]
        assert "confidence" in feat["properties"]
        assert "fill" in feat["properties"]

    def test_risk_velocity_demo_scenarios(self):
        for scen in ['A', 'B', 'C']:
            response = client.get(f"/api/risk_velocity?min_lon=91.5&min_lat=25.5&max_lon=92.0&max_lat=26.0&resolution=0.05&scenario={scen}")
            assert response.status_code == 200
            data = response.json()
            assert len(data["features"]) > 0

    def test_malformed_bbox_rejected(self):
        # min_lon > max_lon returns empty GeoJSON or 400
        response = client.get("/api/risk_velocity?min_lon=93.0&min_lat=25.5&max_lon=91.0&max_lat=26.0")
        assert response.status_code in (200, 400)
        if response.status_code == 200:
            assert len(response.json()["features"]) == 0

    def test_resolution_abuse_rejected(self):
        # resolution < 0.01
        response = client.get("/api/risk_velocity?min_lon=91.0&min_lat=25.0&max_lon=92.0&max_lat=26.0&resolution=0.001")
        assert response.status_code == 422 # Query validation

    def test_prediction_endpoint_includes_velocity_and_timeline(self):
        res = client.post("/api/predictions/run", json={"latitude": 25.5788, "longitude": 91.8933})
        assert res.status_code == 200
        data = res.json()
        assert "risk_velocity" in data
        assert "trend" in data["risk_velocity"]
        assert "timeline_snapshots" in data
