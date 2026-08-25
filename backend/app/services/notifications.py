"""
PRITHVI WATCH — Emergency Notification Abstraction & Demo Provider.

Safety & Integrity Mandates:
1. DO NOT send real SMS messages automatically.
2. All simulated notifications are explicitly labeled as [DEMO SIMULATION].
3. Disclaimers are included in all demo notification payloads.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger("prithvi.notifications")

class BaseNotificationChannel(ABC):
    """Abstract base class for emergency alert notification channels."""

    @abstractmethod
    def dispatch_alert(
        self,
        event_id: str,
        sender_name: str,
        latitude: float,
        longitude: float,
        recipient_phone: str,
        recipient_name: str,
        message: Optional[str] = None,
        is_demo: bool = True
    ) -> Dict[str, Any]:
        """Dispatches an alert through the specific channel."""
        pass


class DemoInAppNotificationProvider(BaseNotificationChannel):
    """
    Demo/In-App Notification Provider for safe simulation and testing.
    Records structured dispatch receipts without calling real carrier networks.
    """
    def __init__(self):
        self._dispatch_log: List[Dict[str, Any]] = []

    def dispatch_alert(
        self,
        event_id: str,
        sender_name: str,
        latitude: float,
        longitude: float,
        recipient_phone: str,
        recipient_name: str,
        message: Optional[str] = None,
        is_demo: bool = True
    ) -> Dict[str, Any]:
        notification_id = f"NOTIF-DEMO-{uuid.uuid4().hex[:8].upper()}"
        now_utc = datetime.now(timezone.utc).isoformat()

        # Mask recipient phone for logging & receipt privacy
        masked_phone = self._mask_phone(recipient_phone)

        # Standardized safety disclaimer
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
            "notification_id": notification_id,
            "event_id": event_id,
            "recipient_name": recipient_name,
            "recipient_phone_masked": masked_phone,
            "channel": "DEMO_IN_APP_SIMULATION",
            "is_demo": True,
            "status": "DELIVERED_SIMULATED",
            "timestamp": now_utc,
            "formatted_message": formatted_text,
            "disclaimer": disclaimer
        }

        self._dispatch_log.append(receipt)
        if len(self._dispatch_log) > 100:
            self._dispatch_log.pop(0)

        logger.info(f"Demo notification simulated for event {event_id} -> {masked_phone}")
        return receipt

    def get_recent_notifications(self, limit: int = 20) -> List[Dict[str, Any]]:
        return self._dispatch_log[-limit:][::-1]

    @staticmethod
    def _mask_phone(phone: str) -> str:
        cleaned = phone.strip()
        if len(cleaned) >= 10:
            return cleaned[:4] + "****" + cleaned[-2:]
        return "***"

# Global demo notification service instance
demo_notification_provider = DemoInAppNotificationProvider()
