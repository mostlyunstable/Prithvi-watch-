"""
Adversarial Stress Test Suite for Spatial Hazard Grid Calculations & Bounding Box Limits.
PRITHVI WATCH Milestone 1 Challenger 1 Empirical Harness.

Validates:
1. Regional bounding box spans at various resolutions [0.01, 0.50].
2. Inverted coordinates, degenerate bounds, and non-numeric coordinates.
3. Coordinates outside NER raster coverage.
4. Exact boundary limits for MAX_GRID_CELLS = 10,000 (9999, 10000, 10001).
5. GeoJSON RFC 7946 compliance: CCW Polygon winding, [lon, lat] ordering, property harmonization.
6. Vectorized inference throughput and latency profiling.
"""

import math
import time
import pytest
import numpy as np
from fastapi.testclient import TestClient
from app.main import app
from app.ml.map_generator import generate_risk_geojson, MAX_GRID_CELLS

client = TestClient(app)


def calculate_polygon_signed_area(coords):
    """
    Computes signed area of a 2D polygon ring using the Shoelace formula.
    In RFC 7946 / Cartesian coordinates (x=lon, y=lat):
    - Positive signed area (> 0) indicates Counter-Clockwise (CCW) winding (exterior ring).
    - Negative signed area (< 0) indicates Clockwise (CW) winding.
    """
    area = 0.0
    n = len(coords)
    for i in range(n - 1):
        x_i, y_i = coords[i][0], coords[i][1]
        x_next, y_next = coords[i + 1][0], coords[i + 1][1]
        area += (x_i * y_next - x_next * y_i)
    return area / 2.0


class TestRegionalBoundingBoxesAndResolutions:
    """Stress tests regional bounding box spans across various resolutions."""

    @pytest.mark.parametrize("res", [0.50, 0.20, 0.10])
    def test_full_ner_extent_allowed_resolutions(self, res):
        # 10 deg lon x 9 deg lat (min_lon=88.0, min_lat=21.0, max_lon=98.0, max_lat=30.0)
        # res=0.50 -> 20 x 18 = 360 cells
        # res=0.20 -> 50 x 45 = 2,250 cells
        # res=0.10 -> 100 x 90 = 9,000 cells
        response = client.get(
            f"/api/risk_map?min_lon=88.0&min_lat=21.0&max_lon=98.0&max_lat=30.0&resolution={res}"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "FeatureCollection"
        assert isinstance(data["features"], list)
        assert len(data["features"]) > 0

    @pytest.mark.parametrize("res", [0.09, 0.05, 0.02, 0.01])
    def test_full_ner_extent_oversized_resolutions_rejected(self, res):
        # res=0.09 -> 112 x 100 = 11,200 cells > 10,000
        # res=0.05 -> 200 x 180 = 36,000 cells > 10,000
        # res=0.01 -> 1,000 x 900 = 900,000 cells > 10,000
        response = client.get(
            f"/api/risk_map?min_lon=88.0&min_lat=21.0&max_lon=98.0&max_lat=30.0&resolution={res}"
        )
        assert response.status_code == 400
        data = response.json()
        assert "exceeding maximum allowed ceiling of 10000" in data["detail"]

    @pytest.mark.parametrize("res", [0.01, 0.02, 0.05, 0.10, 0.25, 0.50])
    def test_local_bounding_box_valid_resolutions(self, res):
        # Local 0.5 deg x 0.5 deg bbox in Meghalaya (DEM coverage)
        # res=0.01 -> 50 x 50 = 2,500 cells
        # res=0.50 -> 1 x 1 = 1 cell
        response = client.get(
            f"/api/risk_map?min_lon=91.5&min_lat=25.5&max_lon=92.0&max_lat=26.0&resolution={res}"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) > 0

    @pytest.mark.parametrize("bad_res", [0.009, 0.001, 0.51, 1.0, 0.0, -0.05, -1.0])
    def test_resolution_out_of_bounds(self, bad_res):
        response = client.get(
            f"/api/risk_map?min_lon=91.5&min_lat=25.5&max_lon=92.0&max_lat=26.0&resolution={bad_res}"
        )
        assert response.status_code in [400, 422]


class TestInvertedAndDegenerateCoordinates:
    """Stress tests inverted coordinates, zero-area bounds, and NaN/Inf."""

    def test_inverted_longitude(self):
        # min_lon (95.0) > max_lon (90.0)
        res = generate_risk_geojson(min_lon=95.0, min_lat=25.0, max_lon=90.0, max_lat=26.0, resolution=0.05)
        assert res == {"type": "FeatureCollection", "features": []}

        # Via API
        resp = client.get("/api/risk_map?min_lon=95.0&min_lat=25.0&max_lon=90.0&max_lat=26.0&resolution=0.05")
        assert resp.status_code == 200
        assert resp.json() == {"type": "FeatureCollection", "features": []}

    def test_inverted_latitude(self):
        # min_lat (26.0) > max_lat (25.0)
        res = generate_risk_geojson(min_lon=90.0, min_lat=26.0, max_lon=95.0, max_lat=25.0, resolution=0.05)
        assert res == {"type": "FeatureCollection", "features": []}

        resp = client.get("/api/risk_map?min_lon=90.0&min_lat=26.0&max_lon=95.0&max_lat=25.0&resolution=0.05")
        assert resp.status_code == 200
        assert resp.json() == {"type": "FeatureCollection", "features": []}

    def test_both_inverted(self):
        res = generate_risk_geojson(min_lon=95.0, min_lat=26.0, max_lon=90.0, max_lat=25.0, resolution=0.05)
        assert res == {"type": "FeatureCollection", "features": []}

    def test_equal_coordinates_zero_area(self):
        # min_lon == max_lon
        res1 = generate_risk_geojson(min_lon=91.0, min_lat=25.0, max_lon=91.0, max_lat=26.0, resolution=0.05)
        assert res1 == {"type": "FeatureCollection", "features": []}

        # min_lat == max_lat
        res2 = generate_risk_geojson(min_lon=91.0, min_lat=25.0, max_lon=92.0, max_lat=25.0, resolution=0.05)
        assert res2 == {"type": "FeatureCollection", "features": []}

        # exact single point
        res3 = generate_risk_geojson(min_lon=91.0, min_lat=25.0, max_lon=91.0, max_lat=25.0, resolution=0.05)
        assert res3 == {"type": "FeatureCollection", "features": []}

    def test_nan_coordinates(self):
        with pytest.raises(ValueError, match="must not be NaN"):
            generate_risk_geojson(min_lon=float('nan'), min_lat=25.0, max_lon=92.0, max_lat=26.0, resolution=0.05)


class TestOutsideRasterCoverage:
    """Stress tests coordinates completely or partially outside NER DEM raster extent."""

    def test_far_outside_pacific_ocean(self):
        res = generate_risk_geojson(min_lon=-150.0, min_lat=0.0, max_lon=-149.0, max_lat=1.0, resolution=0.05)
        assert res == {"type": "FeatureCollection", "features": []}

        resp = client.get("/api/risk_map?min_lon=-150.0&min_lat=0.0&max_lon=-149.0&max_lat=1.0&resolution=0.05")
        assert resp.status_code == 200
        assert resp.json() == {"type": "FeatureCollection", "features": []}

    def test_far_outside_gujarat_western_india(self):
        res = generate_risk_geojson(min_lon=70.0, min_lat=22.0, max_lon=71.0, max_lat=23.0, resolution=0.05)
        assert res == {"type": "FeatureCollection", "features": []}

    def test_southern_hemisphere(self):
        res = generate_risk_geojson(min_lon=130.0, min_lat=-30.0, max_lon=131.0, max_lat=-29.0, resolution=0.05)
        assert res == {"type": "FeatureCollection", "features": []}

    def test_partial_overlap_with_dem_boundary(self):
        # Raster is centered around Meghalaya/Assam (lat 24.5-27.0, lon 89.5-93.5)
        # Query bbox that straddles the edge (e.g. lon 88.0 to 91.5, lat 25.0 to 26.0)
        res = generate_risk_geojson(min_lon=88.0, min_lat=25.0, max_lon=91.5, max_lat=26.0, resolution=0.05)
        assert res["type"] == "FeatureCollection"
        # Should contain features for the valid DEM portion and gracefully omit the non-covered part
        if len(res["features"]) > 0:
            for feat in res["features"]:
                coords = feat["geometry"]["coordinates"][0]
                assert len(coords) == 5
                props = feat["properties"]
                assert not np.isnan(props["elevation"])
                assert not np.isnan(props["slope"])
                assert not np.isnan(props["risk_probability"])


class TestExactGridCellBoundaries:
    """Stress tests boundary conditions at exact MAX_GRID_CELLS = 10,000 threshold."""

    def test_exact_9999_cells_accepted_res025(self):
        # 99 x 101 = 9,999 cells with clean binary fraction res=0.25 (2^-2)
        min_lon, min_lat = 90.0, 25.0
        max_lon, max_lat = 114.75, 50.25
        res = 0.25
        num_lon = int(np.ceil((max_lon - min_lon) / res))
        num_lat = int(np.ceil((max_lat - min_lat) / res))
        assert num_lon * num_lat == 9999

        # API call must succeed
        resp = client.get(
            f"/api/risk_map?min_lon={min_lon}&min_lat={min_lat}&max_lon={max_lon}&max_lat={max_lat}&resolution={res}"
        )
        assert resp.status_code == 200
        assert resp.json()["type"] == "FeatureCollection"

    def test_exact_9999_cells_accepted_res005(self):
        # 101 x 99 = 9,999 cells with res=0.05
        min_lon, min_lat = 90.0, 25.0
        max_lon, max_lat = 95.05, 29.95
        res = 0.05
        num_lon = int(np.ceil((max_lon - min_lon) / res))
        num_lat = int(np.ceil((max_lat - min_lat) / res))
        assert num_lon * num_lat == 9999

        resp = client.get(
            f"/api/risk_map?min_lon={min_lon}&min_lat={min_lat}&max_lon={max_lon}&max_lat={max_lat}&resolution={res}"
        )
        assert resp.status_code == 200
        assert resp.json()["type"] == "FeatureCollection"

    def test_exact_10000_cells_accepted_res025(self):
        # 100 x 100 = 10,000 cells (exact ceiling boundary) with res=0.25
        min_lon, min_lat = 90.0, 25.0
        max_lon, max_lat = 115.0, 50.0
        res = 0.25
        num_lon = int(np.ceil((max_lon - min_lon) / res))
        num_lat = int(np.ceil((max_lat - min_lat) / res))
        assert num_lon * num_lat == 10000

        # API call must succeed at the exact boundary
        resp = client.get(
            f"/api/risk_map?min_lon={min_lon}&min_lat={min_lat}&max_lon={max_lon}&max_lat={max_lat}&resolution={res}"
        )
        assert resp.status_code == 200
        assert resp.json()["type"] == "FeatureCollection"

    def test_exact_10000_cells_accepted_res001(self):
        # 100 x 100 = 10,000 cells with res=0.01
        min_lon, min_lat = 90.0, 25.0
        max_lon, max_lat = 91.0, 26.0
        res = 0.01
        num_lon = int(np.ceil((max_lon - min_lon) / res))
        num_lat = int(np.ceil((max_lat - min_lat) / res))
        assert num_lon * num_lat == 10000

        resp = client.get(
            f"/api/risk_map?min_lon={min_lon}&min_lat={min_lat}&max_lon={max_lon}&max_lat={max_lat}&resolution={res}"
        )
        assert resp.status_code == 200
        assert resp.json()["type"] == "FeatureCollection"

    def test_exact_10001_cells_rejected_res025(self):
        # 73 x 137 = 10,001 cells (10,000 + 1) with res=0.25
        min_lon, min_lat = 90.0, 25.0
        max_lon, max_lat = 108.25, 59.25
        res = 0.25
        num_lon = int(np.ceil((max_lon - min_lon) / res))
        num_lat = int(np.ceil((max_lat - min_lat) / res))
        assert num_lon * num_lat == 10001

        # Direct function call must raise ValueError
        with pytest.raises(ValueError, match="exceeding maximum allowed ceiling of 10000"):
            generate_risk_geojson(min_lon, min_lat, max_lon, max_lat, res)

        # API call must return HTTP 400
        resp = client.get(
            f"/api/risk_map?min_lon={min_lon}&min_lat={min_lat}&max_lon={max_lon}&max_lat={max_lat}&resolution={res}"
        )
        assert resp.status_code == 400
        assert "exceeding maximum allowed ceiling of 10000" in resp.json()["detail"]

    def test_exact_10001_cells_rejected_res005(self):
        # 137 x 73 = 10,001 cells with res=0.05
        min_lon, min_lat = 90.0, 25.0
        max_lon, max_lat = 96.85, 28.65
        res = 0.05
        num_lon = int(np.ceil((max_lon - min_lon) / res))
        num_lat = int(np.ceil((max_lat - min_lat) / res))
        assert num_lon * num_lat == 10001

        with pytest.raises(ValueError, match="exceeding maximum allowed ceiling of 10000"):
            generate_risk_geojson(min_lon, min_lat, max_lon, max_lat, res)

        resp = client.get(
            f"/api/risk_map?min_lon={min_lon}&min_lat={min_lat}&max_lon={max_lon}&max_lat={max_lat}&resolution={res}"
        )
        assert resp.status_code == 400
        assert "exceeding maximum allowed ceiling of 10000" in resp.json()["detail"]


class TestGeoJSONRFC7946ComplianceAndProperties:
    """Validates RFC 7946 Polygon winding, coordinate order [lon, lat], and property harmonization."""

    def test_rfc7946_winding_order_counter_clockwise(self):
        res = generate_risk_geojson(91.5, 25.5, 91.8, 25.8, resolution=0.05)
        assert res["type"] == "FeatureCollection"
        assert len(res["features"]) > 0

        for idx, feat in enumerate(res["features"]):
            geom = feat["geometry"]
            assert geom["type"] == "Polygon"
            coords = geom["coordinates"][0] # Exterior linear ring
            assert len(coords) == 5, f"Polygon {idx} does not have 5 coordinate points (closed box)"

            # Verify closure: first point == last point
            assert coords[0] == coords[4], f"Polygon {idx} is not closed: {coords[0]} != {coords[4]}"

            # Calculate signed area using Shoelace formula
            # RFC 7946: Exterior ring MUST follow right-hand rule (CCW in lon/lat -> signed area > 0)
            signed_area = calculate_polygon_signed_area(coords)
            assert signed_area > 0, (
                f"Polygon {idx} violates RFC 7946 exterior ring winding! "
                f"Signed area is {signed_area} (expected positive for counter-clockwise)."
            )

    def test_coordinate_ordering_lon_lat(self):
        res = generate_risk_geojson(91.5, 25.5, 91.8, 25.8, resolution=0.05)
        for idx, feat in enumerate(res["features"]):
            coords = feat["geometry"]["coordinates"][0]
            for pt_idx, pt in enumerate(coords):
                assert len(pt) == 2, f"Coordinate point {pt_idx} in polygon {idx} does not have [x, y]"
                lon, lat = pt[0], pt[1]
                # In North Eastern Region: lon in ~[88, 98], lat in ~[21, 30]
                assert 85.0 <= lon <= 100.0, f"Longitude out of expected NER range: {lon}"
                assert 20.0 <= lat <= 35.0, f"Latitude out of expected NER range: {lat}"

    def test_property_keys_harmonization_and_types(self):
        res = generate_risk_geojson(91.5, 25.5, 91.8, 25.8, resolution=0.05)
        assert len(res["features"]) > 0

        valid_risk_levels = {"LOW", "MODERATE", "HIGH", "CRITICAL"}
        expected_color_map = {
            "LOW": "#4ade80",
            "MODERATE": "#facc15",
            "HIGH": "#fb923c",
            "CRITICAL": "#ef4444"
        }

        for idx, feat in enumerate(res["features"]):
            props = feat["properties"]
            
            # Required property keys
            for key in ["risk_probability", "probability", "landslide_probability", "risk_level", "fill", "elevation", "slope"]:
                assert key in props, f"Missing required property key '{key}' in polygon {idx}"

            rp = props["risk_probability"]
            p = props["probability"]
            lp = props["landslide_probability"]
            level = props["risk_level"]
            fill = props["fill"]
            elev = props["elevation"]
            slope = props["slope"]

            # Strict equality among all three probability keys
            assert rp == p == lp, f"Probability keys not synchronized in feature {idx}: rp={rp}, p={p}, lp={lp}"
            assert 0.0 <= rp <= 1.0, f"Probability {rp} out of [0, 1] range in feature {idx}"
            assert level in valid_risk_levels, f"Invalid risk_level '{level}' in feature {idx}"
            assert fill == expected_color_map[level], f"Fill color '{fill}' does not match level '{level}' in feature {idx}"

            # Validate risk level threshold classification
            if rp >= 0.8:
                assert level == "CRITICAL"
            elif rp >= 0.6:
                assert level == "HIGH"
            elif rp >= 0.4:
                assert level == "MODERATE"
            else:
                assert level == "LOW"

            # Validate physical realism of terrain values
            assert isinstance(elev, (int, float)) and not np.isnan(elev)
            assert isinstance(slope, (int, float)) and not np.isnan(slope)
            assert elev >= 0.0, f"Unrealistic negative elevation: {elev}"
            assert 0.0 <= slope <= 90.0, f"Unrealistic slope angle: {slope}"


class TestPerformanceAndVectorizedInference:
    """Benchmarks latency across grid sizes to guarantee robust real-time responsiveness."""

    @pytest.mark.parametrize("res,expected_max_ms", [
        (0.10, 3000), # ~100 cells
        (0.05, 3000), # ~400 cells
        (0.02, 3500), # ~2,500 cells
    ])
    def test_vectorized_inference_latency(self, res, expected_max_ms):
        # 1.0 deg x 1.0 deg box
        t0 = time.time()
        res_data = generate_risk_geojson(91.0, 25.0, 92.0, 26.0, resolution=res)
        dt_ms = (time.time() - t0) * 1000
        assert res_data["type"] == "FeatureCollection"
        assert len(res_data["features"]) > 0
        assert dt_ms < expected_max_ms, f"Grid generation took {dt_ms:.1f}ms (threshold: {expected_max_ms}ms)"
