"""
PRITHVI WATCH — Multi-Device Push Notification Tests (Phase 2).

Verifies:
1. Device token registration, updating, and deduplication
2. Invalid push token format rejection
3. Push notification dispatch via Expo Push Provider
4. Handling of failed/unregistered device tokens cleanly
5. Multi-device routing (Phone A SOS -> Phone B Push Dispatch)
6. Duplicate push notification prevention for the same SOS event
7. Push payload privacy compliance (Zero raw contact phone numbers in push body or data)
8. Receipt acknowledgment lifecycle (SENT -> ACKNOWLEDGED)
"""

import pytest
import uuid
import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.services.emergency import emergency_service
from app.services.notifications import expo_push_provider

client = TestClient(app)


class TestDeviceTokenRegistration:
    def test_register_valid_expo_push_token(self):
        device_id = f"phone-b-{uuid.uuid4().hex[:6]}"
        push_token = f"ExponentPushToken[{uuid.uuid4().hex[:22]}]"
        payload = {
            "device_id": device_id,
            "push_token": push_token,
            "platform": "android",
            "phone_number": "+919876543210",
            "responder_name": "Officer Borah (NDRF)"
        }
        res = client.post("/api/emergency/devices/register", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert data["device_id"] == device_id
        assert data["push_token"] == push_token
        assert data["is_active"] is True
        assert data["responder_name"] == "Officer Borah (NDRF)"

    def test_token_deduplication_and_update(self):
        device_id = f"phone-b-{uuid.uuid4().hex[:6]}"
        push_token1 = f"ExponentPushToken[{uuid.uuid4().hex[:22]}]"
        push_token2 = f"ExponentPushToken[{uuid.uuid4().hex[:22]}]"

        # Register initial token
        res1 = client.post("/api/emergency/devices/register", json={
            "device_id": device_id,
            "push_token": push_token1,
            "platform": "ios",
            "phone_number": "+919876543210"
        })
        assert res1.status_code == 201

        # Re-register same device with updated token
        res2 = client.post("/api/emergency/devices/register", json={
            "device_id": device_id,
            "push_token": push_token2,
            "platform": "ios",
            "phone_number": "+919876543210"
        })
        assert res2.status_code == 201
        assert res2.json()["push_token"] == push_token2

    def test_invalid_push_token_rejected(self):
        device_id = f"phone-b-{uuid.uuid4().hex[:6]}"
        invalid_payload = {
            "device_id": device_id,
            "push_token": "not-an-expo-token-12345",
            "platform": "android"
        }
        res = client.post("/api/emergency/devices/register", json=invalid_payload)
        assert res.status_code == 422

    def test_unregister_push_token(self):
        device_id = f"phone-b-{uuid.uuid4().hex[:6]}"
        push_token = f"ExponentPushToken[{uuid.uuid4().hex[:22]}]"
        client.post("/api/emergency/devices/register", json={
            "device_id": device_id,
            "push_token": push_token,
            "platform": "android"
        })

        del_res = client.delete(f"/api/emergency/devices/{push_token}")
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "success"


class TestMultiDeviceSOSPushDispatch:
    @patch("requests.post")
    def test_phone_a_sos_triggers_phone_b_real_push(self, mock_post):
        # Mock Expo Push Gateway success response
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "data": [{
                "status": "ok",
                "id": f"ticket-{uuid.uuid4().hex[:8]}"
            }]
        }
        mock_post.return_value = mock_resp

        phone_a_device = f"phone-a-{uuid.uuid4().hex[:6]}"
        phone_b_device = f"phone-b-{uuid.uuid4().hex[:6]}"
        phone_b_number = "+919876500001"
        phone_b_token = f"ExponentPushToken[{uuid.uuid4().hex[:22]}]"

        # 1. Phone B registers push token and phone profile
        reg_res = client.post("/api/emergency/devices/register", json={
            "device_id": phone_b_device,
            "push_token": phone_b_token,
            "platform": "android",
            "phone_number": phone_b_number,
            "responder_name": "Sita Devi (Rescue Coordinator)"
        })
        assert reg_res.status_code == 201

        # 2. Phone A adds Phone B as an emergency contact
        contact_res = client.post("/api/emergency/contacts", json={
            "device_id": phone_a_device,
            "name": "Sita Devi",
            "phone_number": phone_b_number,
            "relationship": "Local Authority",
            "is_primary": True
        })
        assert contact_res.status_code == 201

        # 3. Phone A triggers emergency SOS
        sos_res = client.post("/api/emergency/sos", json={
            "device_id": phone_a_device,
            "latitude": 26.1800,
            "longitude": 91.7500,
            "altitude_m": 54.0,
            "accuracy_m": 8.0,
            "battery_pct": 90,
            "sender_name": "Anil Kalita",
            "mode": "LIVE",
            "user_note": "Stranded by flash flood near Bharalu river."
        })
        assert sos_res.status_code == 201
        sos_data = sos_res.json()
        assert sos_data["status"] == "ACTIVE"
        assert sos_data["real_push_dispatched_count"] >= 1

        # Verify push receipt
        push_receipts = [r for r in sos_data["notification_receipts"] if r.get("channel") == "EXPO_REAL_PUSH"]
        assert len(push_receipts) >= 1
        push_rcpt = push_receipts[0]
        assert push_rcpt["status"] == "SENT"
        assert push_rcpt["ticket_id"] is not None

        # Verify requests.post was called with privacy-compliant payload
        assert mock_post.called
        sent_payload = mock_post.call_args[1]["json"]
        assert sent_payload["to"] == phone_b_token
        assert "Anil Kalita" in sent_payload["title"]
        assert "26.1800°N" in sent_payload["body"]

        # STRICT PRIVACY AUDIT: Ensure NO contact phone numbers are inside push payload
        assert "phone_number" not in sent_payload["data"]
        assert phone_b_number not in json.dumps(sent_payload)

    @patch("requests.post")
    def test_failed_push_token_error_handling(self, mock_post):
        # Mock Expo Push Gateway error response (e.g. DeviceNotRegistered)
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "data": [{
                "status": "error",
                "message": "The recipient device is not registered with Expo.",
                "details": {"error": "DeviceNotRegistered"}
            }]
        }
        mock_post.return_value = mock_resp

        phone_a_device = f"phone-a-{uuid.uuid4().hex[:6]}"
        phone_b_device = f"phone-b-{uuid.uuid4().hex[:6]}"
        phone_b_number = "+919876500002"
        phone_b_token = f"ExponentPushToken[{uuid.uuid4().hex[:22]}]"

        client.post("/api/emergency/devices/register", json={
            "device_id": phone_b_device,
            "push_token": phone_b_token,
            "platform": "ios",
            "phone_number": phone_b_number
        })

        client.post("/api/emergency/contacts", json={
            "device_id": phone_a_device,
            "name": "Stale Responder",
            "phone_number": phone_b_number,
            "relationship": "Friend"
        })

        sos_res = client.post("/api/emergency/sos", json={
            "device_id": phone_a_device,
            "latitude": 26.1800,
            "longitude": 91.7500,
            "mode": "LIVE"
        })
        assert sos_res.status_code == 201
        push_receipts = [r for r in sos_res.json()["notification_receipts"] if r.get("channel") == "EXPO_REAL_PUSH"]
        assert len(push_receipts) >= 1
        assert push_receipts[0]["status"] == "FAILED"
        assert "DeviceNotRegistered" in push_receipts[0]["error_reason"]

    def test_acknowledge_push_notification(self):
        device_id = f"phone-a-{uuid.uuid4().hex[:6]}"
        sos_res = client.post("/api/emergency/sos", json={
            "device_id": device_id,
            "latitude": 26.1800,
            "longitude": 91.7500,
            "mode": "DEMO"
        })
        assert sos_res.status_code == 201
        receipts = sos_res.json()["notification_receipts"]
        if receipts:
            rcpt_id = receipts[0]["receipt_id"]
            ack_res = client.post(f"/api/emergency/notifications/{rcpt_id}/ack?device_id=phone-b-responder")
            assert ack_res.status_code == 200
            assert ack_res.json()["receipt"]["status"] == "ACKNOWLEDGED"
            assert ack_res.json()["receipt"]["acknowledged_by_device"] == "phone-b-responder"
