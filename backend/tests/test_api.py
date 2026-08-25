import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert "PRITHVI WATCH API" in response.json()["service"]

def test_model_info():
    response = client.get("/api/model/info")
    assert response.status_code == 200
    data = response.json()
    assert "audited_metrics" in data
    assert "data_sources" in data
    assert data["audited_metrics"]["spatial_roc_auc"] >= 0.75
    assert data["feature_count"] == 10

def test_get_regions():
    response = client.get("/api/regions")
    assert response.status_code == 200
    data = response.json()
    assert "type" in data
    assert data["type"] == "FeatureCollection"
    assert "features" in data

def test_get_historical_landslides():
    response = client.get("/api/history/landslides")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) > 0

def test_run_prediction_default():
    payload = {
        "latitude": 25.5,
        "longitude": 92.5
    }
    response = client.post("/api/predictions/run", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "prediction_id" in data
    assert "risk_level" in data
    assert "landslide_probability" in data
    assert "explanation" in data
    assert "timeline" in data
    assert "historical_context" in data
    assert len(data["features"]) == 10

def test_run_prediction_scenarios():
    for sc, expected_levels in [
        ('A', ["LOW", "MODERATE"]),
        ('B', ["HIGH", "CRITICAL"]),
        ('C', ["CRITICAL"])
    ]:
        payload = {"latitude": 25.5, "longitude": 92.5, "scenario": sc}
        response = client.post("/api/predictions/run", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["risk_level"] in expected_levels
        assert data["mode"] == "DEMO SCENARIO"

def test_risk_map():
    response = client.get("/api/risk_map?min_lon=91.0&min_lat=25.0&max_lon=91.05&max_lat=25.05&resolution=0.05")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert "features" in data
    if len(data["features"]) > 0:
        props = data["features"][0]["properties"]
        assert "risk_probability" in props
        assert "probability" in props
        assert "landslide_probability" in props
        assert "risk_level" in props
        assert "fill" in props
        assert props["risk_probability"] == props["probability"] == props["landslide_probability"]

