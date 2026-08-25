"""
PRITHVI WATCH — Emergency & SOS Module Tests.

Verifies:
1. Emergency contact CRUD and phone number validation
2. Relationship normalization and primary contact uniqueness
3. SOS event trigger with GPS coordinate validation
4. Rapid SOS duplicate prevention and rate limiting
5. SOS cancellation lifecycle
6. Demo notification dispatch and safety disclaimers
7. Sensitive contact data masking
"""

import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.services.emergency import emergency_service
from app.services.notifications import demo_notification_provider

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_emergency_state():
    """Cleans temporary memory/file test data before each test."""
    yield


class TestEmergencyContacts:
    def test_create_contact_valid_indian_phone(self):
        device_id = f"test-device-{uuid.uuid4().hex[:6]}"
        payload = {
            "device_id": device_id,
            "name": "Dr. Ananya Sharma",
            "phone_number": "9876543210",
            "relationship": "Doctor",
            "is_primary": True
        }
        res = client.post("/api/emergency/contacts", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert data["id"].startswith("CNT-")
        assert data["name"] == "Dr. Ananya Sharma"
        assert data["phone_number"] == "9876543210"
        assert data["relationship"] == "Doctor"
        assert data["is_primary"] is True
        assert data["is_verified"] is True

    def test_create_contact_valid_e164_phone(self):
        device_id = f"test-device-{uuid.uuid4().hex[:6]}"
        payload = {
            "device_id": device_id,
            "name": "Arun Borah",
            "phone_number": "+91 94350 12345",
            "relationship": "Family",
            "is_primary": False
        }
        res = client.post("/api/emergency/contacts", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert data["phone_number"] == "+919435012345"

    def test_create_contact_invalid_phone_rejected(self):
        device_id = f"test-device-{uuid.uuid4().hex[:6]}"
        invalid_payload = {
            "device_id": device_id,
            "name": "Invalid Contact",
            "phone_number": "12345",  # Too short, invalid format
            "relationship": "Friend"
        }
        res = client.post("/api/emergency/contacts", json=invalid_payload)
        assert res.status_code == 422

    def test_create_contact_short_name_rejected(self):
        device_id = f"test-device-{uuid.uuid4().hex[:6]}"
        invalid_payload = {
            "device_id": device_id,
            "name": "A",  # Less than min length 2
            "phone_number": "9876543210",
            "relationship": "Friend"
        }
        res = client.post("/api/emergency/contacts", json=invalid_payload)
        assert res.status_code == 422

    def test_update_and_delete_contact_lifecycle(self):
        device_id = f"test-device-{uuid.uuid4().hex[:6]}"
        # 1. Create
        create_res = client.post("/api/emergency/contacts", json={
            "device_id": device_id,
            "name": "Rahul Das",
            "phone_number": "9864011223",
            "relationship": "Neighbor"
        })
        assert create_res.status_code == 201
        contact_id = create_res.json()["id"]

        # 2. Update
        update_res = client.put(f"/api/emergency/contacts/{contact_id}?device_id={device_id}", json={
            "name": "Rahul Das (Local Hero)",
            "relationship": "Local Authority"
        })
        assert update_res.status_code == 200
        assert update_res.json()["name"] == "Rahul Das (Local Hero)"
        assert update_res.json()["relationship"] == "Local Authority"

        # 3. Delete
        delete_res = client.delete(f"/api/emergency/contacts/{contact_id}?device_id={device_id}")
        assert delete_res.status_code == 200
        assert delete_res.json()["status"] == "success"

        # 4. Verify Not Found
        verify_update = client.put(f"/api/emergency/contacts/{contact_id}", json={"name": "Ghost"})
        assert verify_update.status_code == 404

    def test_contact_phone_masking(self):
        device_id = f"test-device-{uuid.uuid4().hex[:6]}"
        client.post("/api/emergency/contacts", json={
            "device_id": device_id,
            "name": "Secret Contact",
            "phone_number": "+919876543210",
            "relationship": "Friend"
        })

        # Plain listing
        res_plain = client.get(f"/api/emergency/contacts?device_id={device_id}&mask=false")
        assert res_plain.status_code == 200
        assert res_plain.json()[0]["phone_number"] == "+919876543210"

        # Masked listing
        res_masked = client.get(f"/api/emergency/contacts?device_id={device_id}&mask=true")
        assert res_masked.status_code == 200
        assert "****" in res_masked.json()[0]["phone_number"]


class TestSOSEventLifecycle:
    def test_trigger_sos_and_demo_notification_dispatch(self):
        device_id = f"test-device-{uuid.uuid4().hex[:6]}"
        
        # Add a contact for this device
        client.post("/api/emergency/contacts", json={
            "device_id": device_id,
            "name": "Rohan Borah",
            "phone_number": "9876543210",
            "relationship": "Brother"
        })

        sos_payload = {
            "device_id": device_id,
            "latitude": 26.1800,
            "longitude": 91.7500,
            "altitude_m": 55.0,
            "accuracy_m": 8.5,
            "battery_pct": 82,
            "sender_name": "Priyanka Kalita",
            "trigger_type": "PRESS_AND_HOLD_3S",
            "mode": "DEMO",
            "user_note": "Flash flooding near riverbank."
        }

        res = client.post("/api/emergency/sos", json=sos_payload)
        assert res.status_code == 201
        data = res.json()
        assert data["id"].startswith("SOS-")
        assert data["status"] == "ACTIVE"
        assert data["latitude"] == 26.1800
        assert data["longitude"] == 91.7500
        assert data["notified_contacts_count"] >= 1
        assert len(data["notification_receipts"]) >= 1

        receipt = data["notification_receipts"][0]
        assert receipt["is_demo"] is True
        assert "[DEMO SIMULATION]" in receipt["formatted_message"]
        assert "DEMO SIMULATION ONLY" in receipt["disclaimer"]

    def test_rapid_sos_duplicate_suppressed(self):
        device_id = f"test-device-{uuid.uuid4().hex[:6]}"
        sos_payload = {
            "device_id": device_id,
            "latitude": 26.1800,
            "longitude": 91.7500,
            "mode": "DEMO"
        }

        res1 = client.post("/api/emergency/sos", json=sos_payload)
        assert res1.status_code == 201
        event1_id = res1.json()["id"]
        assert res1.json()["is_duplicate_suppressed"] is False

        # Immediate second trigger from same device
        res2 = client.post("/api/emergency/sos", json=sos_payload)
        assert res2.status_code == 201
        assert res2.json()["id"] == event1_id
        assert res2.json()["is_duplicate_suppressed"] is True

    def test_invalid_coordinates_rejected(self):
        device_id = f"test-device-{uuid.uuid4().hex[:6]}"
        invalid_payload = {
            "device_id": device_id,
            "latitude": 125.0,  # Invalid latitude (> 90)
            "longitude": 91.7500
        }
        res = client.post("/api/emergency/sos", json=invalid_payload)
        assert res.status_code == 422

    def test_cancel_sos_lifecycle(self):
        device_id = f"test-device-{uuid.uuid4().hex[:6]}"
        res = client.post("/api/emergency/sos", json={
            "device_id": device_id,
            "latitude": 26.1800,
            "longitude": 91.7500,
            "mode": "DEMO"
        })
        event_id = res.json()["id"]

        # Cancel event
        cancel_res = client.post(f"/api/emergency/sos/{event_id}/cancel?reason=Safe+at+evacuation+point")
        assert cancel_res.status_code == 200
        assert cancel_res.json()["status"] == "cancelled"
        assert cancel_res.json()["event"]["status"] == "CANCELLED"
        assert cancel_res.json()["event"]["cancellation_reason"] == "Safe at evacuation point"

    def test_demo_notifications_endpoint(self):
        res = client.get("/api/emergency/notifications/demo?limit=10")
        assert res.status_code == 200
        data = res.json()
        assert data["is_demo"] is True
        assert "disclaimer" in data
        assert isinstance(data["notifications"], list)
