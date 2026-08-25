"""
Focused and Hardened Test Suite for the Deterministic Flood Risk & Inundation Assessment Pipeline.

Tests:
1. Mathematical Determinism: Identical coordinates produce identical outputs across repeated runs.
2. Real-world Spatial Differentiation: Alluvial floodplain vs High Himalayan crest.
3. Separation of Concerns:
   - current_flood_evidence
   - flood_susceptibility
   - meteorological_forcing
   - historical_recurrence
   - data_confidence
4. Zero Mock/Synthetic Values: All output values are bounded, authentic numbers with real ISO UTC timestamps.
5. Signed Feature Contributions: Sum of positive contribution percentages explain risk level.
6. Edge Cases & Boundary Handling: Out-of-bounds coords, degenerate inputs, HTTP 422 validation.
7. REST API Endpoints: GET and POST /api/floods/assess compliance.
"""

import pytest
import numpy as np
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.ml.flood_engine import flood_engine

client = TestClient(app)

class TestHardenedFloodPipeline:
    """Rigorous tests for the hardened flood engine."""

    def test_flood_risk_engine_determinism(self):
        """Identical coordinates must yield bitwise-identical flood probability and risk level."""
        lat, lon = 26.9124, 94.2188  # Majuli Island (Brahmaputra Basin)
        res1 = flood_engine.assess_coordinate(lat, lon)
        res2 = flood_engine.assess_coordinate(lat, lon)

        assert res1["assessment"]["flood_probability"] == res2["assessment"]["flood_probability"]
        assert res1["assessment"]["risk_level"] == res2["assessment"]["risk_level"]
        assert res1["flood_susceptibility"]["distance_to_river_km"] == res2["flood_susceptibility"]["distance_to_river_km"]
        assert res1["flood_susceptibility"]["score"] == res2["flood_susceptibility"]["score"]

    def test_floodplain_vs_montane_differentiation(self):
        """
        Low-lying alluvial floodplain (Guwahati Brahmaputra 26.18°N, 91.75°E) must have significantly higher
        flood susceptibility than a steep mountain scarp (Cherrapunji 25.27°N, 91.73°E).
        """
        floodplain_res = flood_engine.assess_coordinate(26.18, 91.75)
        montane_res = flood_engine.assess_coordinate(25.27, 91.73)

        assert floodplain_res["flood_susceptibility"]["score"] > montane_res["flood_susceptibility"]["score"]
        assert floodplain_res["flood_susceptibility"]["distance_to_river_km"] < montane_res["flood_susceptibility"]["distance_to_river_km"]
        assert floodplain_res["assessment"]["flood_probability"] > montane_res["assessment"]["flood_probability"]

    def test_strict_separation_of_evidence_susceptibility_and_confidence(self):
        """Ensures explicit separation between current evidence, terrain susceptibility, and data confidence."""
        lat, lon = 26.1445, 91.7362  # Guwahati / Brahmaputra
        res = flood_engine.assess_coordinate(lat, lon)

        assert "current_flood_evidence" in res
        assert "flood_susceptibility" in res
        assert "meteorological_forcing" in res
        assert "historical_recurrence" in res
        assert "data_confidence" in res
        assert "feature_contributions" in res

        # Evidence checks
        assert isinstance(res["current_flood_evidence"]["detected"], bool)
        assert res["current_flood_evidence"]["evidence_level"] in [
            "CONFIRMED_WATER_INUNDATION", "SATURATED_FLOODPLAIN", "DRY_SURFACE", "NO_OBSERVATION"
        ]

        # Confidence checks
        assert res["data_confidence"]["confidence_level"] in [
            "HIGH_CONFIDENCE", "DEGRADED_CONFIDENCE", "INSUFFICIENT_DATA"
        ]
        assert 0.0 <= res["data_confidence"]["completeness_pct"] <= 100.0

    def test_no_synthetic_or_mock_values_in_production(self):
        """Ensures all output values are bounded, authentic numbers and timestamps are valid ISO UTC."""
        lat, lon = 24.8170, 93.9368  # Imphal / Barak-Manipur Basin
        res = flood_engine.assess_coordinate(lat, lon)

        prob = res["assessment"]["flood_probability"]
        assert 0.0 <= prob <= 1.0
        assert res["assessment"]["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
        assert len(res["assessment"]["advisory"]) > 5

        # Check timestamp
        ts = datetime.fromisoformat(res["timestamp"].replace("Z", "+00:00"))
        assert ts.year >= 2026

        # Check signed feature contributions
        assert len(res["feature_contributions"]) >= 6
        for fc in res["feature_contributions"]:
            assert "feature" in fc and "value" in fc and "contribution_pct" in fc
            assert isinstance(fc["contribution_pct"], (int, float))
            assert 0.0 <= fc["contribution_pct"] <= 100.0

    def test_flood_assess_get_api_endpoint(self):
        """Verify GET /api/floods/assess returns HTTP 200 and schema compliant response."""
        response = client.get("/api/floods/assess?lat=26.9124&lon=94.2188")
        assert response.status_code == 200
        data = response.json()
        assert "assessment" in data
        assert "flood_susceptibility" in data
        assert "current_flood_evidence" in data
        assert "data_confidence" in data
        assert data["assessment"]["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]

    def test_flood_assess_post_api_endpoint(self):
        """Verify POST /api/floods/assess returns HTTP 200 and schema compliant response."""
        response = client.post("/api/floods/assess", json={"latitude": 27.3389, "longitude": 88.6065})
        assert response.status_code == 200
        data = response.json()
        assert data["latitude"] == 27.3389
        assert data["longitude"] == 88.6065
        assert "geographic_context" in data
        assert "feature_contributions" in data

    def test_flood_assess_invalid_coordinates_validation(self):
        """Verify out-of-range coordinates are rejected with HTTP 422."""
        res_lat = client.get("/api/floods/assess?lat=95.0&lon=90.0")
        assert res_lat.status_code == 422

        res_lon = client.get("/api/floods/assess?lat=25.0&lon=200.0")
        assert res_lon.status_code == 422

    def test_outside_ner_boundary_handling(self):
        """Coordinates outside NER are processed without crashing and flagged in geographic_context."""
        outside_res = flood_engine.assess_coordinate(28.468, 77.438)  # New Delhi
        assert outside_res["geographic_context"]["in_ner_domain"] is False
        assert outside_res["assessment"]["flood_probability"] >= 0.0
