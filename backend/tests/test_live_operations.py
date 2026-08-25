import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.services.live_operations import live_operations, OperationalEvent

client = TestClient(app)

class TestLiveOperationsStatusAndFreshness:
    def test_operations_status_endpoint(self):
        response = client.get("/api/operations/status")
        assert response.status_code == 200
        data = response.json()
        assert data["system_status"] == "OPERATIONAL"
        assert data["mode"] == "LIVE"
        assert "sources" in data
        
        # Verify all 5 sources exist
        sources = data["sources"]
        assert "weather" in sources
        assert "satellite" in sources
        assert "terrain" in sources
        assert "landslides" in sources
        assert "model" in sources
        
        # Satellite honesty check: discrete acquisitions, not "continuous live"
        assert "6–12 day" in sources["satellite"]["cadence"]
        assert "Static" in sources["terrain"]["age_display"]

    def test_activity_feed_endpoint(self):
        response = client.get("/api/operations/activity")
        assert response.status_code == 200
        data = response.json()
        assert "activity" in data
        assert "count" in data
        assert len(data["activity"]) > 0
        
        # Check event schema
        first_event = data["activity"][0]
        assert "event_id" in first_event
        assert "event_type" in first_event
        assert "timestamp" in first_event
        assert "title" in first_event
        assert "severity" in first_event

    def test_weather_refresh_endpoint(self):
        response = client.post("/api/operations/refresh_weather?lat=25.5788&lon=91.8933")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "SUCCESS"
        assert "changed" in data
        assert "timestamp" in data

    def test_regional_risk_summary_endpoint(self):
        response = client.get("/api/operations/risk_summary")
        assert response.status_code == 200
        data = response.json()
        assert "total_monitored_cells" in data
        assert "counts" in data
        counts = data["counts"]
        assert "CRITICAL" in counts
        assert "HIGH" in counts
        assert "MODERATE" in counts
        assert "LOW" in counts
        assert data["total_monitored_cells"] == sum(counts.values())

class TestLiveOperationsEventLifecycle:
    def test_record_assessment_event_creation(self):
        initial_count = len(live_operations.get_recent_activity(50))
        live_operations.record_assessment_completion(
            location_name="Shillong Test Location",
            lat=25.58,
            lon=91.89,
            risk_level="HIGH",
            probability=0.72,
            previous_level="MODERATE",
            previous_probability=0.45,
            primary_driver="7-day rainfall accumulation (+55 mm)"
        )
        events = live_operations.get_recent_activity(50)
        assert len(events) >= initial_count + 1
        
        # Verify threshold crossing event generated
        types = [e["event_type"] for e in events[:2]]
        assert "RISK_LEVEL_CHANGED" in types or "ASSESSMENT_COMPLETED" in types

    def test_live_vs_demo_mode_isolation(self):
        # Demo mode call
        demo_resp = client.post("/api/predictions/run", json={"latitude": 25.5788, "longitude": 91.8933, "scenario": "C"})
        assert demo_resp.status_code == 200
        demo_data = demo_resp.json()
        assert demo_data["mode"] == "DEMO SCENARIO"
        assert demo_data["risk_level"] == "CRITICAL"

        # Real data check
        status_resp = client.get("/api/operations/status")
        assert status_resp.status_code == 200
        assert status_resp.json()["mode"] == "LIVE"

    def test_no_fabricated_timestamps(self):
        events = live_operations.get_recent_activity(10)
        now = datetime.now(timezone.utc)
        for ev in events:
            ev_time = datetime.fromisoformat(ev["timestamp"].replace("Z", "+00:00"))
            # Timestamp must be within the last 10 minutes, not arbitrary future or 1970
            time_diff = (now - ev_time).total_seconds()
            assert -5.0 <= time_diff <= 600.0
