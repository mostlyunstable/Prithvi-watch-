"""
Empirical Challenge & Stress-Test Suite for PRITHVI WATCH Milestone 1.
Challenger 2: ML Inference Engine, SHAP Log-Odds Additivity, Demo Scenarios, and Fault Isolation.

Empirical verification scope:
1. Mathematical SHAP Log-Odds Additivity: sigma(E[margin] + sum(phi_i)) == P(landslide)
   across 30+ randomly sampled coordinates across NER and extreme synthetic domain coordinates.
2. Demo Scenario Determinism ('A', 'B', 'C') and Probability Range [0.0, 1.0].
3. Fallback Simulation under Total Network Isolation (Satellite, Weather 500/503/timeout, DEM out-of-bounds, all combined).
4. Negative Coordinate Handling and Invalid Input Rejection (HTTP 422 / HTTP 400).
"""

import math
import random
import unittest
from unittest.mock import patch
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient
import requests

from app.main import app
from app.ml.model import risk_model
from app.ml.features import (
    extract_real_features,
    SAR_VV_NEUTRAL_MEDIAN,
    SAR_VH_NEUTRAL_MEDIAN,
    RAINFALL_NEUTRAL_BASELINE
)

client = TestClient(app)

def sigmoid(z: float) -> float:
    """Standard logistic sigmoid function."""
    return 1.0 / (1.0 + math.exp(-z))


class TestEmpiricalMLAndSHAP(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        risk_model.load()
        assert risk_model.is_loaded, "Risk model failed to load."
        assert risk_model.explainer is not None, "SHAP explainer failed to initialize."
        # Warm up explainer to ensure expected_value is fully initialized
        dummy = pd.DataFrame([{
            'elevation': 500.0, 'slope': 15.0, 'aspect': 90.0,
            'tri': 5.0, 'relief_5x5': 30.0, 'plan_curvature': 0.0,
            'dist_to_infrastructure_km': 10.0,
            'rainfall_7d_mm': 50.0, 'sar_vv': 0.3, 'sar_vh': 0.05
        }])
        risk_model.explainer.shap_values(dummy)

    def test_shap_log_odds_additivity_ner_sampling(self):
        """
        Empirical Challenge 1A:
        Verify mathematical SHAP log-odds additivity:
        sigma(E[margin] + sum(phi_i)) == P(landslide)
        across 30 randomly sampled coordinates across the North Eastern Region.
        """
        random.seed(42)
        np.random.seed(42)

        # 30 random coordinates spanning Meghalaya, Assam, Sikkim, Arunachal Pradesh
        ner_lat_range = (25.0, 28.5)
        ner_lon_range = (88.5, 95.5)

        cols = [
            'elevation', 'slope', 'aspect', 'tri', 'relief_5x5',
            'plan_curvature', 'dist_to_infrastructure_km',
            'rainfall_7d_mm', 'sar_vv', 'sar_vh'
        ]
        max_abs_diff = 0.0
        results = []

        for i in range(30):
            lat = random.uniform(*ner_lat_range)
            lon = random.uniform(*ner_lon_range)

            # Mock network calls for speed and determinism while testing real DEM sampling
            sim_rain = round(random.uniform(5.0, 350.0), 2)
            sim_vv = round(random.uniform(0.1, 1.8), 4)
            sim_vh = round(random.uniform(0.02, 0.4), 4)

            with patch("app.ml.features.get_live_rainfall", return_value={"available": True, "rainfall_7d_mm": sim_rain}), \
                 patch("app.ml.features.get_live_sentinel1", return_value={"available": True, "sar_vv": sim_vv, "sar_vh": sim_vh}):
                
                features, data_quality, telemetry = extract_real_features(lat, lon)
            
            df = pd.DataFrame([features])[cols]
            
            p_landslide = float(risk_model.model.predict_proba(df)[0][1])
            shap_phi = risk_model.explainer.shap_values(df)[0]
            base_expected_margin = float(np.ravel(risk_model.explainer.expected_value)[0])
            
            margin_sum = base_expected_margin + float(np.sum(shap_phi))
            p_reconstructed = sigmoid(margin_sum)
            
            diff = abs(p_landslide - p_reconstructed)
            max_abs_diff = max(max_abs_diff, diff)
            
            results.append({
                "sample_id": i + 1,
                "lat": round(lat, 4),
                "lon": round(lon, 4),
                "p_landslide": p_landslide,
                "p_reconstructed": p_reconstructed,
                "diff": diff,
                "base_margin": base_expected_margin,
                "shap_sum": float(np.sum(shap_phi)),
                "margin_sum": margin_sum
            })

            # Assert strict equality within single-precision floating point epsilon (1e-5)
            self.assertAlmostEqual(
                p_landslide,
                p_reconstructed,
                places=5,
                msg=f"SHAP additivity violated at sample {i+1} ({lat}, {lon}): "
                    f"P_model={p_landslide:.7f} != P_shap={p_reconstructed:.7f}, diff={diff:.2e}"
            )

        print(f"\n[EMPIRICAL] Tested 30 NER coordinate samples. Max SHAP additivity error: {max_abs_diff:.2e}")
        self.assertLess(max_abs_diff, 1e-5)

    def test_shap_log_odds_additivity_extreme_domain_grid(self):
        """
        Empirical Challenge 1B:
        Verify mathematical SHAP log-odds additivity under extreme synthetic feature boundaries.
        """
        test_cases = [
            {"elevation": 0.0, "slope": 0.0, "aspect": 0.0, "tri": 0.0, "relief_5x5": 0.0, "plan_curvature": 0.0, "dist_to_infrastructure_km": 10.0, "rainfall_7d_mm": 0.0, "sar_vv": 0.01, "sar_vh": 0.005},
            {"elevation": 4500.0, "slope": 75.0, "aspect": 359.0, "tri": 45.0, "relief_5x5": 250.0, "plan_curvature": -1.5, "dist_to_infrastructure_km": 1.0, "rainfall_7d_mm": 800.0, "sar_vv": 2.5, "sar_vh": 0.8},
            {"elevation": 1200.0, "slope": 35.0, "aspect": 180.0, "tri": 20.0, "relief_5x5": 110.0, "plan_curvature": 0.2, "dist_to_infrastructure_km": 5.0, "rainfall_7d_mm": 250.0, "sar_vv": 0.8, "sar_vh": 0.15},
            {"elevation": 200.0, "slope": 5.0, "aspect": 90.0, "tri": 2.0, "relief_5x5": 15.0, "plan_curvature": 0.0, "dist_to_infrastructure_km": 25.0, "rainfall_7d_mm": 10.0, "sar_vv": 0.2, "sar_vh": 0.04},
            {"elevation": 3000.0, "slope": 45.0, "aspect": 270.0, "tri": 25.0, "relief_5x5": 160.0, "plan_curvature": -0.8, "dist_to_infrastructure_km": 2.0, "rainfall_7d_mm": 500.0, "sar_vv": 1.2, "sar_vh": 0.3},
        ]

        cols = [
            'elevation', 'slope', 'aspect', 'tri', 'relief_5x5',
            'plan_curvature', 'dist_to_infrastructure_km',
            'rainfall_7d_mm', 'sar_vv', 'sar_vh'
        ]

        for idx, feat in enumerate(test_cases):
            df = pd.DataFrame([feat])[cols]
            p_landslide = float(risk_model.model.predict_proba(df)[0][1])
            shap_phi = risk_model.explainer.shap_values(df)[0]
            base_expected_margin = float(np.ravel(risk_model.explainer.expected_value)[0])
            
            margin_sum = base_expected_margin + float(np.sum(shap_phi))
            p_reconstructed = sigmoid(margin_sum)
            diff = abs(p_landslide - p_reconstructed)

            self.assertAlmostEqual(
                p_landslide,
                p_reconstructed,
                places=5,
                msg=f"Synthetic boundary test {idx} failed SHAP additivity: diff={diff}"
            )
            self.assertTrue(0.0 <= p_landslide <= 1.0)


class TestDemoScenarios(unittest.TestCase):
    def test_demo_scenario_determinism_and_ranges(self):
        """
        Empirical Challenge 2:
        Verify deterministic response for Scenarios 'A', 'B', 'C' across random coordinates.
        """
        scenarios = {
            'A': {
                'expected_prob': 0.185,
                'expected_risk': 'LOW',
                'expected_timeline': {"Current": "LOW", "+6h": "LOW", "+12h": "LOW", "+24h": "LOW"}
            },
            'B': {
                'expected_prob': 0.742,
                'expected_risk': 'HIGH',
                'expected_timeline': {"Current": "HIGH", "+6h": "HIGH", "+12h": "CRITICAL", "+24h": "CRITICAL"}
            },
            'C': {
                'expected_prob': 0.928,
                'expected_risk': 'CRITICAL',
                'expected_timeline': {"Current": "CRITICAL", "+6h": "CRITICAL", "+12h": "CRITICAL", "+24h": "CRITICAL"}
            }
        }

        # Run 10 iterations per scenario at arbitrary coordinates
        for sc_code, sc_expect in scenarios.items():
            for _ in range(10):
                lat = random.uniform(20.0, 30.0)
                lon = random.uniform(85.0, 98.0)
                
                resp = client.post("/api/predictions/run", json={
                    "latitude": lat,
                    "longitude": lon,
                    "scenario": sc_code
                })
                self.assertEqual(resp.status_code, 200)
                data = resp.json()
                
                self.assertEqual(data["mode"], "DEMO SCENARIO")
                self.assertEqual(data["landslide_probability"], sc_expect["expected_prob"])
                self.assertEqual(data["risk_level"], sc_expect["expected_risk"])
                self.assertEqual(data["timeline"], sc_expect["expected_timeline"])
                self.assertTrue(0.0 <= data["landslide_probability"] <= 1.0)
                self.assertEqual(len(data["explanation"]), 8)
                self.assertEqual(data["data_quality"]["dem"], "AVAILABLE")
                self.assertEqual(data["data_quality"]["weather"], "AVAILABLE")
                self.assertEqual(data["data_quality"]["satellite"], "AVAILABLE")


class TestNetworkIsolationAndFallbacks(unittest.TestCase):
    def test_total_network_isolation(self):
        """
        Empirical Challenge 3A:
        Simulate complete internet blackout (Open-Meteo & Planetary Computer offline).
        Verify system completes prediction with HTTP 200, sets DEGRADED status,
        applies neutral imputations, and does not throw uncaught 500 errors.
        """
        with patch("requests.Session.get", side_effect=requests.exceptions.ConnectionError("Network is down")), \
             patch("requests.Session.post", side_effect=requests.exceptions.ConnectionError("Network is down")):
            
            resp = client.post("/api/predictions/run", json={
                "latitude": 25.5788,
                "longitude": 91.8933
            })

            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            
            # Weather & Satellite must be gracefully degraded
            self.assertEqual(data["data_quality"]["weather"], "DEGRADED")
            self.assertEqual(data["data_quality"]["satellite"], "DEGRADED")
            self.assertTrue(data["telemetry"]["rainfall_imputed"])
            self.assertTrue(data["telemetry"]["sar_imputed"])

            # Neutral baseline assertions
            self.assertEqual(data["features"]["rainfall_7d_mm"], RAINFALL_NEUTRAL_BASELINE)
            self.assertEqual(data["features"]["sar_vv"], SAR_VV_NEUTRAL_MEDIAN)
            self.assertEqual(data["features"]["sar_vh"], SAR_VH_NEUTRAL_MEDIAN)

            # Valid probability range
            self.assertTrue(0.0 <= data["landslide_probability"] <= 1.0)
            self.assertIn(data["risk_level"], ["LOW", "MODERATE", "HIGH", "CRITICAL"])

    def test_weather_api_http_errors_and_timeouts(self):
        """
        Empirical Challenge 3B:
        Simulate Weather API returning HTTP 500, 503, and Timeout.
        """
        for error_scenario in [
            requests.exceptions.Timeout("Open-Meteo timed out after 5000ms"),
            requests.exceptions.HTTPError("500 Internal Server Error"),
            requests.exceptions.HTTPError("503 Service Unavailable")
        ]:
            with patch("app.ml.features.get_live_rainfall", side_effect=error_scenario):
                resp = client.post("/api/predictions/run", json={
                    "latitude": 25.5788,
                    "longitude": 91.8933
                })
                self.assertEqual(resp.status_code, 200)
                data = resp.json()
                self.assertEqual(data["data_quality"]["weather"], "DEGRADED")
                self.assertTrue(data["telemetry"]["rainfall_imputed"])
                self.assertEqual(data["features"]["rainfall_7d_mm"], 20.0)

    def test_dem_out_of_bounds_graceful_handling(self):
        """
        Empirical Challenge 3C:
        Coordinates completely outside NER DEM bounding box (e.g. Indian Ocean, Europe).
        """
        out_of_bounds_coords = [
            (10.0, 77.0),   # Southern India (Kerala/Tamil Nadu)
            (0.0, 0.0),     # Null Island / Atlantic Ocean
            (48.8566, 2.3522), # Paris, France
            (-33.8688, 151.2093) # Sydney, Australia
        ]

        for lat, lon in out_of_bounds_coords:
            with patch("app.ml.features.get_live_rainfall", return_value={"available": True, "rainfall_7d_mm": 15.0}), \
                 patch("app.ml.features.get_live_sentinel1", return_value={"available": True, "sar_vv": 0.3, "sar_vh": 0.07}):
                
                resp = client.post("/api/predictions/run", json={
                    "latitude": lat,
                    "longitude": lon
                })
                self.assertEqual(resp.status_code, 200)
                data = resp.json()
                self.assertEqual(data["data_quality"]["dem"], "DEGRADED")
                self.assertIsNotNone(data["telemetry"]["dem_error"])
                self.assertEqual(data["features"]["elevation"], 0.0)
                self.assertEqual(data["features"]["slope"], 0.0)
                self.assertEqual(data["features"]["aspect"], 0.0)
                self.assertTrue(0.0 <= data["landslide_probability"] <= 1.0)


class TestNegativeAndInvalidCoordinates(unittest.TestCase):
    def test_negative_valid_coordinate_handling(self):
        """
        Empirical Challenge 4A:
        Negative coordinates that are geometrically valid (e.g., Southern / Western hemisphere)
        should be processed without crashes.
        """
        neg_coords = [
            (-25.5, 92.5),   # Southern hemisphere
            (25.5, -92.5),   # Western hemisphere
            (-15.0, -45.0)   # Brazil
        ]

        for lat, lon in neg_coords:
            with patch("app.ml.features.get_live_rainfall", return_value={"available": True, "rainfall_7d_mm": 5.0}), \
                 patch("app.ml.features.get_live_sentinel1", return_value={"available": True, "sar_vv": 0.25, "sar_vh": 0.05}):
                
                resp = client.post("/api/predictions/run", json={
                    "latitude": lat,
                    "longitude": lon
                })
                self.assertEqual(resp.status_code, 200)
                data = resp.json()
                self.assertEqual(data["latitude"], lat)
                self.assertEqual(data["longitude"], lon)
                self.assertTrue(0.0 <= data["landslide_probability"] <= 1.0)

    def test_invalid_input_rejection_http_422(self):
        """
        Empirical Challenge 4B:
        Invalid inputs violating schema / boundaries must return HTTP 422 Unprocessable Entity.
        """
        invalid_payloads = [
            {"latitude": 95.0, "longitude": 92.0},    # Lat > 90
            {"latitude": -95.0, "longitude": 92.0},   # Lat < -90
            {"latitude": 25.0, "longitude": 185.0},   # Lon > 180
            {"latitude": 25.0, "longitude": -185.0},  # Lon < -180
            {"latitude": "non_numeric", "longitude": 92.0}, # Non-numeric lat
            {"latitude": 25.0, "longitude": "invalid"},     # Non-numeric lon
            {"latitude": None, "longitude": 92.0},          # Null lat
            {},                                             # Empty payload
            {"latitude": 25.0},                             # Missing lon
            {"longitude": 92.0}                             # Missing lat
        ]

        for idx, payload in enumerate(invalid_payloads):
            resp = client.post("/api/predictions/run", json=payload)
            self.assertEqual(
                resp.status_code,
                422,
                msg=f"Payload {idx} ({payload}) did not return 422, got {resp.status_code}: {resp.text}"
            )

    def test_risk_map_invalid_bounds_and_resolution(self):
        """
        Empirical Challenge 4C:
        Verify HTTP 400/422 rejection on invalid spatial queries for /api/risk_map.
        """
        # Lat > 90
        r_lat_out = client.get("/api/risk_map?min_lon=91.0&min_lat=95.0&max_lon=92.0&max_lat=96.0&resolution=0.05")
        self.assertEqual(r_lat_out.status_code, 422)

        # Lon < -180
        r_lon_out = client.get("/api/risk_map?min_lon=-190.0&min_lat=25.0&max_lon=-185.0&max_lat=26.0&resolution=0.05")
        self.assertEqual(r_lon_out.status_code, 422)

        # Negative resolution
        r_neg_res = client.get("/api/risk_map?min_lon=91.0&min_lat=25.0&max_lon=92.0&max_lat=26.0&resolution=-0.05")
        self.assertIn(r_neg_res.status_code, [400, 422])

        # Zero resolution
        r_zero_res = client.get("/api/risk_map?min_lon=91.0&min_lat=25.0&max_lon=92.0&max_lat=26.0&resolution=0.0")
        self.assertIn(r_zero_res.status_code, [400, 422])

        # Exceeds max cells (> 10,000 cells)
        r_huge = client.get("/api/risk_map?min_lon=80.0&min_lat=10.0&max_lon=100.0&max_lat=30.0&resolution=0.01")
        self.assertIn(r_huge.status_code, [400, 422])


if __name__ == "__main__":
    unittest.main()
