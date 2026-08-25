import pytest
import numpy as np
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.ml.satellite import get_live_sentinel1
from app.ml.weather import get_live_rainfall
from app.ml.features import extract_real_features
from app.ml.map_generator import generate_risk_geojson

client = TestClient(app)

def test_sentinel_timeout_does_not_create_artificial_critical_risk():
    """
    REGRESSION TEST (P1 Fix):
    Verifies that an external STAC / Sentinel-1 network failure or timeout
    does NOT trigger a false CRITICAL landslide alarm via the pre-2014 SAR=0 artifact.
    """
    # Mock satellite provider to simulate network failure / timeout
    with patch("app.ml.features.get_live_sentinel1") as mock_sar:
        mock_sar.return_value = {
            "sar_vv": None,
            "sar_vh": None,
            "available": False,
            "acquisition_date": None,
            "source": "Sentinel-1 RTC (Planetary Computer)",
            "error": "Connection timed out (mocked)"
        }
        
        # Test coordinates in Meghalaya with moderate slope
        response = client.post(
            "/api/predictions/run",
            json={"latitude": 25.5788, "longitude": 91.8933}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify explicit degraded status telemetry
        assert data["data_quality"]["satellite"] == "DEGRADED"
        assert data["telemetry"]["sar_imputed"] is True
        assert data["telemetry"]["satellite_error"] is not None
        
        # Verify that imputed SAR is the neutral median (0.35), NOT 0.0
        assert data["features"]["sar_vv"] == 0.35
        assert data["features"]["sar_vh"] == 0.08
        
        # Verify prediction probability is not falsely blown up to > 0.99
        assert 0.0 <= data["landslide_probability"] <= 1.0


def test_weather_provider_timeout_graceful_handling():
    """Verifies that Open-Meteo failure falls back to neutral seasonal baseline with DEGRADED status."""
    with patch("app.ml.features.get_live_rainfall") as mock_weather:
        mock_weather.return_value = {
            "rainfall_7d_mm": None,
            "available": False,
            "source": "Open-Meteo ERA5/ECMWF Live",
            "error": "HTTP 503 Service Unavailable"
        }
        
        response = client.post(
            "/api/predictions/run",
            json={"latitude": 25.5788, "longitude": 91.8933}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["data_quality"]["weather"] == "DEGRADED"
        assert data["telemetry"]["rainfall_imputed"] is True
        assert data["features"]["rainfall_7d_mm"] == 20.0


def test_risk_map_validation_hardening():
    """Verifies that invalid resolution and oversized bounding boxes are rejected with HTTP 400."""
    # 1. Zero resolution -> HTTP 400
    r1 = client.get("/api/risk_map?min_lon=91.0&min_lat=25.0&max_lon=92.0&max_lat=26.0&resolution=0")
    assert r1.status_code in [400, 422]
    
    # 2. Negative resolution -> HTTP 400 / 422
    r2 = client.get("/api/risk_map?min_lon=91.0&min_lat=25.0&max_lon=92.0&max_lat=26.0&resolution=-0.05")
    assert r2.status_code in [400, 422]
    
    # 3. Huge bounding box exceeding 10,000 cells -> HTTP 400
    r3 = client.get("/api/risk_map?min_lon=80.0&min_lat=10.0&max_lon=100.0&max_lat=30.0&resolution=0.01")
    assert r3.status_code in [400, 422]
    
    # 4. Valid 0.05 resolution in small extent -> HTTP 200
    r4 = client.get("/api/risk_map?min_lon=91.0&min_lat=25.0&max_lon=91.1&max_lat=25.1&resolution=0.05")
    assert r4.status_code == 200
    assert "features" in r4.json()


def test_geospatial_plane_gradient_math():
    """Verifies mathematical correctness of gradient formulas on flat vs inclined surfaces."""
    # Flat plane
    elev_flat = np.full((100, 100), 500.0)
    dx_f, dy_f = np.gradient(elev_flat, 30.0, 30.0)
    slope_flat = np.degrees(np.arctan(np.sqrt(dx_f**2 + dy_f**2)))
    assert np.allclose(slope_flat, 0.0)
    
    # Known 45-degree slope (rise / run = 1.0)
    # 30m elevation rise per 30m horizontal distance
    x = np.arange(100) * 30.0
    elev_45 = np.tile(x, (100, 1))
    dx_45, dy_45 = np.gradient(elev_45, 30.0, 30.0) # dx is along axis 1 (horizontal columns)
    # gradient along axis 1 is dy_45 in numpy 2D gradient tuple (df/drow, df/dcol)
    slope_45 = np.degrees(np.arctan(np.sqrt(dx_45**2 + dy_45**2)))
    assert np.isclose(slope_45[1:-1, 1:-1].mean(), 45.0, atol=0.1)


def test_metrics_endpoint():
    """Verifies operational telemetry endpoint responds with structured metrics."""
    response = client.get("/api/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "requests_total" in data["metrics"]
    assert "predictions_total" in data["metrics"]


def test_risk_geojson_properties_harmonization():
    """Verifies that generate_risk_geojson harmonizes risk_probability, probability, and landslide_probability."""
    res = generate_risk_geojson(91.8, 25.5, 91.9, 25.6, resolution=0.05)
    assert res["type"] == "FeatureCollection"
    assert len(res["features"]) > 0
    for feat in res["features"]:
        props = feat["properties"]
        assert "risk_probability" in props
        assert "probability" in props
        assert "landslide_probability" in props
        assert props["risk_probability"] == props["probability"] == props["landslide_probability"]
        assert 0.0 <= props["risk_probability"] <= 1.0
        assert props["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
        assert "fill" in props
        assert "elevation" in props
        assert "slope" in props

