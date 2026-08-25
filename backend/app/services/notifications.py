"""
PRITHVI WATCH — Multi-Channel Emergency Notification System.

Supports:
1. Expo Real Push Notification Provider (Phone A -> Backend -> Phone B)
2. In-App Demo Simulation Provider (Safe Sandbox / Judge Testing)
3. Multi-channel routing, status tracking (PENDING -> SENT -> DELIVERED / FAILED -> ACKNOWLEDGED),
   and strict privacy enforcement (zero phone numbers in push payloads).
"""

import re
import json
import uuid
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import requests

logger = logging.getLogger("prithvi.notifications")

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
EXPO_TOKEN_REGEX = re.compile(r"^(ExponentPushToken|ExpoPushToken)\[[a-zA-Z0-9_\-]+\]$")


class BaseNotificationChannel(ABC):
    """Abstract base interface for emergency alert notification channels."""

    @abstractmethod
    def dispatch_alert(
        self,
        event_id: str,
        sender_name: str,
        latitude: float,
        longitude: float,
        recipient_token: Optional[str] = None,
        recipient_name: Optional[str] = None,
        recipient_phone: Optional[str] = None,
        message: Optional[str] = None,
        is_demo: bool = True
    ) -> Dict[str, Any]:
        pass


class DemoInAppNotificationProvider(BaseNotificationChannel):
    """
    Demo / In-App Simulated Notification Provider.
    Safe demonstration sandbox that logs simulated alert receipts without calling external push networks.
    """
    def __init__(self):
        self._dispatch_log: List[Dict[str, Any]] = []

    def dispatch_alert(
        self,
        event_id: str,
        sender_name: str,
        latitude: float,
        longitude: float,
        recipient_token: Optional[str] = None,
        recipient_name: Optional[str] = None,
        recipient_phone: Optional[str] = None,
        message: Optional[str] = None,
        is_demo: bool = True
    ) -> Dict[str, Any]:
        receipt_id = f"RCPT-DEMO-{uuid.uuid4().hex[:8].upper()}"
        now_utc = datetime.now(timezone.utc).isoformat()
        masked_phone = self._mask_phone(recipient_phone or "")

        disclaimer = (
            "DEMO SIMULATION ONLY: This is a test notification generated in a safe demonstration "
            "environment. No real emergency services or SMS networks were contacted."
        )

        formatted_text = (
            f"[DEMO SIMULATION] EMERGENCY SOS ALERT from {sender_name}!\n"
            f"Location: {latitude:.4f}°N, {longitude:.4f}°E\n"
            f"Maps Link: https://maps.google.com/?q={latitude:.4f},{longitude:.4f}\n"
            f"Time: {now_utc}\n"
            f"Message: {message or 'Immediate assistance requested.'}\n"
            f"Event ID: {event_id}\n\n"
            f"⚠️ {disclaimer}"
        )

        receipt = {
            "receipt_id": receipt_id,
            "event_id": event_id,
            "channel": "DEMO_IN_APP",
            "is_demo": True,
            "status": "DELIVERED",
            "recipient_name": recipient_name or "Emergency Contact",
            "recipient_phone_masked": masked_phone,
            "recipient_token_masked": None,
            "timestamp": now_utc,
            "formatted_message": formatted_text,
            "disclaimer": disclaimer,
            "ticket_id": f"ticket-demo-{uuid.uuid4().hex[:6]}"
        }

        self._dispatch_log.append(receipt)
        if len(self._dispatch_log) > 200:
            self._dispatch_log.pop(0)

        logger.info(f"Demo in-app notification recorded: {receipt_id} for event {event_id}")
        return receipt

    def get_recent_notifications(self, limit: int = 20) -> List[Dict[str, Any]]:
        return self._dispatch_log[-limit:][::-1]

    @staticmethod
    def _mask_phone(phone: str) -> str:
        cleaned = phone.strip()
        if len(cleaned) >= 10:
            return cleaned[:3] + "****" + cleaned[-4:]
        return "***"


class ExpoPushNotificationProvider(BaseNotificationChannel):
    """
    Real Push Notification Provider via Expo Push API (APNs / FCM relay).
    Enables true multi-device push: Phone A (SOS) -> Backend -> Phone B (Push Received).
    """
    def __init__(self, endpoint_url: str = EXPO_PUSH_URL):
        self.endpoint_url = endpoint_url

    def validate_token(self, token: str) -> bool:
        if not token or not isinstance(token, str):
            return False
        return bool(EXPO_TOKEN_REGEX.match(token.strip()))

    def dispatch_alert(
        self,
        event_id: str,
        sender_name: str,
        latitude: float,
        longitude: float,
        recipient_token: Optional[str] = None,
        recipient_name: Optional[str] = None,
        recipient_phone: Optional[str] = None,
        message: Optional[str] = None,
        is_demo: bool = False
    ) -> Dict[str, Any]:
        receipt_id = f"RCPT-PUSH-{uuid.uuid4().hex[:8].upper()}"
        now_utc = datetime.now(timezone.utc).isoformat()

        if not recipient_token:
            return {
                "receipt_id": receipt_id,
                "event_id": event_id,
                "channel": "EXPO_REAL_PUSH",
                "is_demo": is_demo,
                "status": "FAILED",
                "error_reason": "No push token provided for recipient.",
                "timestamp": now_utc
            }

        token = recipient_token.strip()
        masked_token = token[:12] + "..." + token[-6:] if len(token) > 18 else "***"

        if not self.validate_token(token):
            return {
                "receipt_id": receipt_id,
                "event_id": event_id,
                "channel": "EXPO_REAL_PUSH",
                "is_demo": is_demo,
                "status": "FAILED",
                "recipient_token_masked": masked_token,
                "error_reason": f"Invalid Expo push token format: {token}",
                "timestamp": now_utc
            }

        # Formulate privacy-safe push notification payload
        # STRICT PRIVACY RULE: Zero recipient/sender phone numbers in push payload!
        mode_prefix = "[DEMO SIMULATION] " if is_demo else "🚨 "
        push_title = f"{mode_prefix}EMERGENCY SOS: {sender_name}"
        push_body = f"Immediate assistance requested at {latitude:.4f}°N, {longitude:.4f}°E. Tap to view location & rescue coordination."

        push_payload = {
            "to": token,
            "title": push_title,
            "body": push_body,
            "sound": "default",
            "priority": "high",
            "channelId": "emergency_sos",
            "data": {
                "event_id": event_id,
                "sender_name": sender_name,
                "latitude": latitude,
                "longitude": longitude,
                "timestamp": now_utc,
                "mode": "DEMO" if is_demo else "LIVE_PROTOTYPE",
                "status": "ACTIVE",
                "user_note": message or ""
            }
        }

        try:
            resp = requests.post(
                self.endpoint_url,
                json=push_payload,
                headers={
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                    "Content-Type": "application/json"
                },
                timeout=8.0
            )

            if resp.status_code == 200:
                resp_json = resp.json()
                data_obj = resp_json.get("data", {})
                if isinstance(data_obj, list) and len(data_obj) > 0:
                    ticket = data_obj[0]
                elif isinstance(data_obj, dict):
                    ticket = data_obj
                else:
                    ticket = {}

                ticket_status = ticket.get("status")
                ticket_id = ticket.get("id")
                ticket_error = ticket.get("details", {}).get("error") or ticket.get("message")

                if ticket_status == "ok":
                    return {
                        "receipt_id": receipt_id,
                        "event_id": event_id,
                        "channel": "EXPO_REAL_PUSH",
                        "is_demo": is_demo,
                        "status": "SENT",
                        "recipient_name": recipient_name or "Emergency Responder",
                        "recipient_token_masked": masked_token,
                        "ticket_id": ticket_id,
                        "timestamp": now_utc,
                        "push_title": push_title,
                        "push_body": push_body
                    }
                else:
                    return {
                        "receipt_id": receipt_id,
                        "event_id": event_id,
                        "channel": "EXPO_REAL_PUSH",
                        "is_demo": is_demo,
                        "status": "FAILED",
                        "recipient_name": recipient_name or "Emergency Responder",
                        "recipient_token_masked": masked_token,
                        "error_reason": ticket_error or "Expo push service returned non-ok ticket status.",
                        "timestamp": now_utc
                    }
            else:
                return {
                    "receipt_id": receipt_id,
                    "event_id": event_id,
                    "channel": "EXPO_REAL_PUSH",
                    "is_demo": is_demo,
                    "status": "FAILED",
                    "recipient_token_masked": masked_token,
                    "error_reason": f"Expo push gateway HTTP {resp.status_code}: {resp.text[:120]}",
                    "timestamp": now_utc
                }

        except Exception as e:
            logger.error(f"Push dispatch network exception: {e}")
            return {
                "receipt_id": receipt_id,
                "event_id": event_id,
                "channel": "EXPO_REAL_PUSH",
                "is_demo": is_demo,
                "status": "FAILED",
                "recipient_token_masked": masked_token,
                "error_reason": f"Network exception during push dispatch: {str(e)}",
                "timestamp": now_utc
            }


# Singleton service instances
demo_notification_provider = DemoInAppNotificationProvider()
expo_push_provider = ExpoPushNotificationProvider()
