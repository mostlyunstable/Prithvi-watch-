"""
Empirical Challenger 2 Probing & Verification Harness.
Performs live model inference, SHAP log-odds mathematical verification,
demo scenario determinism, GeoJSON grid inspection, and boundary testing.
"""

import sys
import math
import json
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from app.main import app, format_event_date
from app.ml.model import risk_model
from app.ml.map_generator import generate_risk_geojson

client = TestClient(app)

def sigmoid(z: float) -> float:
    return 1.0 / (1.0 + math.exp(-z))

def main():
    print("================================================================")
    print("   PRITHVI WATCH - EMPIRICAL CHALLENGER 2 PROBE HARNESS   ")
    print("================================================================")
    
    passed_checks = 0
    total_checks = 0

    def check(name: str, condition: bool, detail: str = ""):
        nonlocal passed_checks, total_checks
        total_checks += 1
        if condition:
            passed_checks += 1
            print(f" [PASS] {name} {detail}")
        else:
            print(f" [FAIL] {name} {detail}")
            sys.exit(1)

    # -------------------------------------------------------------
    # 1. Health and System Telemetry Endpoints
    # -------------------------------------------------------------
    print("\n--- 1. Probing System Health & Metadata Endpoints ---")
    r_health = client.get("/api/health")
    check("GET /api/health returns 200", r_health.status_code == 200)
    data_health = r_health.json()
    check("Health status is 'ok'", data_health.get("status") == "ok")
    check("Health mode is 'live'", data_health.get("mode") == "live")

    r_model = client.get("/api/model/info")
    check("GET /api/model/info returns 200", r_model.status_code == 200)
    data_model = r_model.json()
    check("Model features count == 6", data_model.get("feature_count") == 6)
    check("Model features match schema", data_model.get("features") == ["elevation", "slope", "aspect", "rainfall_7d_mm", "sar_vv", "sar_vh"])
    check("Spatial validation metrics present", "audited_metrics" in data_model)

    r_metrics = client.get("/api/metrics")
    check("GET /api/metrics returns 200", r_metrics.status_code == 200)
    data_metrics = r_metrics.json()
    check("Metrics store counters tracked", "requests_total" in data_metrics.get("metrics", {}))

    # -------------------------------------------------------------
    # 2. Demo Scenarios ('A', 'B', 'C') Determinism and Bounds
    # -------------------------------------------------------------
    print("\n--- 2. Probing Demo Scenarios ('A', 'B', 'C') ---")
    scenarios_expected = {
        'A': {'prob': 0.185, 'risk': 'LOW', 'name': 'Scenario A: Normal Conditions'},
        'B': {'prob': 0.742, 'risk': 'HIGH', 'name': 'Scenario B: Heavy Monsoon & Saturated Slope'},
        'C': {'prob': 0.928, 'risk': 'CRITICAL', 'name': 'Scenario C: Extreme Cloudburst & Debris Flow Trigger'}
    }

    for sc_id, sc_exp in scenarios_expected.items():
        resp = client.post("/api/predictions/run", json={
            "latitude": 25.5788,
            "longitude": 91.8933,
            "scenario": sc_id
        })
        check(f"Scenario '{sc_id}' returns 200", resp.status_code == 200)
        pdata = resp.json()
        check(f"Scenario '{sc_id}' mode == 'DEMO SCENARIO'", pdata.get("mode") == "DEMO SCENARIO")
        check(f"Scenario '{sc_id}' probability == {sc_exp['prob']}", pdata.get("landslide_probability") == sc_exp['prob'])
        check(f"Scenario '{sc_id}' risk_level == '{sc_exp['risk']}'", pdata.get("risk_level") == sc_exp['risk'])
        check(f"Scenario '{sc_id}' prob in [0.0, 1.0]", 0.0 <= pdata.get("landslide_probability") <= 1.0)
        check(f"Scenario '{sc_id}' explanations count == 6", len(pdata.get("explanation", [])) == 6)
        check(f"Scenario '{sc_id}' timeline has 4 intervals", len(pdata.get("timeline", {})) == 4)
        
        # Verify historical context date sanitization in prediction response
        hist_ctx = pdata.get("historical_context", {})
        if hist_ctx.get("nearest_event"):
            ev_date = hist_ctx["nearest_event"].get("event_date", "")
            check(f"Scenario '{sc_id}' nearest_event date '{ev_date}' is not 1970 epoch", not ev_date.startswith("1970"))

    # -------------------------------------------------------------
    # 3. Live ML Prediction & Mathematical SHAP Log-Odds Additivity
    # -------------------------------------------------------------
    print("\n--- 3. Probing Live Inference & SHAP Mathematical Additivity ---")
    risk_model.load()
    check("risk_model is_loaded == True", risk_model.is_loaded is True)
    check("risk_model explainer is not None", risk_model.explainer is not None)

    # Test strategic locations across NER
    probe_locations = [
        {"name": "Shillong, Meghalaya", "lat": 25.5788, "lon": 91.8933},
        {"name": "Guwahati, Assam", "lat": 26.1445, "lon": 91.7362},
        {"name": "Gangtok, Sikkim", "lat": 27.3389, "lon": 88.6065},
        {"name": "Itanagar, Arunachal", "lat": 27.0844, "lon": 93.6053},
        {"name": "Cherrapunji, Meghalaya", "lat": 25.2700, "lon": 91.7300},
        {"name": "Mangan, Sikkim", "lat": 27.5050, "lon": 88.5300},
    ]

    cols = ['elevation', 'slope', 'aspect', 'rainfall_7d_mm', 'sar_vv', 'sar_vh']
    max_shap_diff = 0.0

    for loc in probe_locations:
        resp = client.post("/api/predictions/run", json={"latitude": loc["lat"], "longitude": loc["lon"]})
        check(f"Live prediction for {loc['name']} returns 200", resp.status_code == 200)
        data = resp.json()
        
        prob = data["landslide_probability"]
        risk = data["risk_level"]
        check(f"{loc['name']} prob {prob} in [0.0, 1.0]", 0.0 <= prob <= 1.0)
        
        # Verify risk level threshold consistency
        if prob < 0.40:
            expected_risk = "LOW"
        elif prob < 0.60:
            expected_risk = "MODERATE"
        elif prob < 0.80:
            expected_risk = "HIGH"
        else:
            expected_risk = "CRITICAL"
        check(f"{loc['name']} risk_level '{risk}' matches threshold '{expected_risk}'", risk == expected_risk)

        # Verify mathematical SHAP log-odds equality
        feats = data["features"]
        df = pd.DataFrame([feats])[cols]
        p_model = float(risk_model.model.predict_proba(df)[0][1])
        shap_phi = risk_model.explainer.shap_values(df)[0]
        base_val = float(np.ravel(risk_model.explainer.expected_value)[0])
        
        margin_sum = base_val + float(np.sum(shap_phi))
        p_reconstructed = sigmoid(margin_sum)
        diff = abs(p_model - p_reconstructed)
        max_shap_diff = max(max_shap_diff, diff)
        
        check(f"{loc['name']} SHAP log-odds reconstruction diff {diff:.2e} < 1e-5", diff < 1e-5)

    print(f" -> Max observed SHAP log-odds reconstruction diff across test points: {max_shap_diff:.2e}")

    # -------------------------------------------------------------
    # 4. Spatial Hazard Grid (/api/risk_map) & Bounding Box Validation
    # -------------------------------------------------------------
    print("\n--- 4. Probing /api/risk_map GeoJSON & Boundary Limits ---")
    # Valid grid query
    r_map = client.get("/api/risk_map?min_lon=91.5&min_lat=25.5&max_lon=92.0&max_lat=26.0&resolution=0.05")
    check("/api/risk_map valid query returns 200", r_map.status_code == 200)
    grid_geojson = r_map.json()
    check("Risk map returns FeatureCollection", grid_geojson.get("type") == "FeatureCollection")
    check("Risk map features list is non-empty", len(grid_geojson.get("features", [])) > 0)
    
    first_feat = grid_geojson["features"][0]
    props = first_feat.get("properties", {})
    check("Feature contains 'risk_probability' property", "risk_probability" in props)
    check("Feature contains 'probability' property", "probability" in props)
    check("Feature contains 'landslide_probability' property", "landslide_probability" in props)
    check("Feature contains 'risk_level' property", "risk_level" in props)
    check("Feature contains 'fill' property", "fill" in props)
    check("Feature contains 'elevation' property", "elevation" in props)
    check("Feature contains 'slope' property", "slope" in props)
    check("risk_probability in [0.0, 1.0]", 0.0 <= props["risk_probability"] <= 1.0)

    # Check winding order of polygon (RFC 7946 Counter-Clockwise)
    coords = first_feat["geometry"]["coordinates"][0]
    area = 0.0
    for i in range(len(coords) - 1):
        x_i, y_i = coords[i][0], coords[i][1]
        x_next, y_next = coords[i + 1][0], coords[i + 1][1]
        area += (x_i * y_next - x_next * y_i)
    signed_area = area / 2.0
    check(f"Polygon winding order is Counter-Clockwise (signed area {signed_area:.4f} > 0)", signed_area > 0)

    # Oversized grid (> 10,000 cells) rejection
    r_oversized = client.get("/api/risk_map?min_lon=88.0&min_lat=21.0&max_lon=98.0&max_lat=30.0&resolution=0.01")
    check("Oversized grid query (>10k cells) rejected with HTTP 400", r_oversized.status_code == 400)
    check("Error detail mentions cell limit", "exceeding maximum allowed ceiling of 10000" in r_oversized.json().get("detail", ""))

    # Out of bounds resolution rejection
    r_bad_res = client.get("/api/risk_map?min_lon=91.0&min_lat=25.0&max_lon=92.0&max_lat=26.0&resolution=-0.05")
    check("Negative resolution rejected", r_bad_res.status_code in [400, 422])

    # -------------------------------------------------------------
    # 5. Historical Landslides & Sanitization Verification
    # -------------------------------------------------------------
    print("\n--- 5. Probing Historical Landslides & Date Sanitization ---")
    r_hist = client.get("/api/history/landslides")
    check("/api/history/landslides returns 200", r_hist.status_code == 200)
    hist_geojson = r_hist.json()
    check("Historical landslides returns FeatureCollection", hist_geojson.get("type") == "FeatureCollection")
    hist_features = hist_geojson.get("features", [])
    check(f"Historical features count ({len(hist_features)}) >= 900", len(hist_features) >= 900)

    nan_coords_count = 0
    unsanitized_dates_after_formatter = 0
    unavailable_dates_count = 0
    valid_dates_count = 0

    for f in hist_features:
        coords = f.get("geometry", {}).get("coordinates", [])
        if len(coords) >= 2:
            lon, lat = coords[0], coords[1]
            if np.isnan(lon) or np.isnan(lat) or not (-180 <= lon <= 180 and -90 <= lat <= 90):
                nan_coords_count += 1
        raw_d = f.get("properties", {}).get("event_date", "")
        formatted_d = format_event_date(raw_d)
        if formatted_d.startswith("1970") or formatted_d.startswith("1969"):
            unsanitized_dates_after_formatter += 1
        elif formatted_d == "Date unavailable":
            unavailable_dates_count += 1
        else:
            valid_dates_count += 1

    check(f"Zero NaN/out-of-range coordinates in catalog (found: {nan_coords_count})", nan_coords_count == 0)
    check(f"Sanitizer converts 100% of epoch/invalid dates (unsanitized remaining: {unsanitized_dates_after_formatter})", unsanitized_dates_after_formatter == 0)
    check(f"Valid verified dates present in catalog ({valid_dates_count} valid dates, {unavailable_dates_count} marked 'Date unavailable')", valid_dates_count > 0 and unavailable_dates_count > 0)

    print("\n================================================================")
    print(f"   ALL CHECKS PASSED: {passed_checks} / {total_checks} (100% PASS RATE)")
    print("================================================================")

if __name__ == "__main__":
    main()
