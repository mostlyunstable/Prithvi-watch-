"""
PRITHVI WATCH — Emergency & SOS Service.

Provides contact management, SOS event lifecycle, rate-limiting / deduplication,
and demo notification triggering.
Strictly isolated from the ML flood and landslide risk engine.
"""

import re
import json
import uuid
import os
import threading
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, field_validator

from app.config import DATA_DIR
from app.services.notifications import demo_notification_provider

EMERGENCY_DIR = DATA_DIR / "emergency"
CONTACTS_FILE = EMERGENCY_DIR / "contacts.json"
SOS_EVENTS_FILE = EMERGENCY_DIR / "sos_events.json"

# Regex for validating international E.164 (+CC followed by 7-15 digits) or 10-digit national Indian mobile numbers
PHONE_REGEX = re.compile(r"^(\+[1-9]\d{6,14}|[6-9]\d{9})$")

VALID_RELATIONSHIPS = {
    "Family", "Parent", "Spouse", "Sibling", "Child", "Friend",
    "Doctor", "Local Authority", "Neighbor", "Colleague", "Other"
}


class EmergencyContactCreate(BaseModel):
    device_id: str = Field(..., min_length=3, max_length=64, description="Unique client or device identifier")
    name: str = Field(..., min_length=2, max_length=100, description="Full name of emergency contact")
    phone_number: str = Field(..., description="Phone number (E.164 or 10-digit mobile)")
    relationship: str = Field("Family", description="Relationship type")
    is_primary: bool = Field(False, description="Primary contact flag")

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = re.sub(r"[\s\-\(\)]", "", v)
        if not PHONE_REGEX.match(cleaned):
            raise ValueError(f"Invalid phone number format: '{v}'. Must be 10-digit mobile or valid E.164.")
        return cleaned

    @field_validator("relationship")
    @classmethod
    def validate_relationship(cls, v: str) -> str:
        title_v = v.strip().title()
        if title_v not in VALID_RELATIONSHIPS and v.strip() not in VALID_RELATIONSHIPS:
            return "Other"
        return title_v if title_v in VALID_RELATIONSHIPS else v.strip()


class EmergencyContactUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone_number: Optional[str] = None
    relationship: Optional[str] = None
    is_primary: Optional[bool] = None

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = re.sub(r"[\s\-\(\)]", "", v)
        if not PHONE_REGEX.match(cleaned):
            raise ValueError(f"Invalid phone number format: '{v}'. Must be 10-digit mobile or valid E.164.")
        return cleaned


class SOSEventCreate(BaseModel):
    device_id: str = Field(..., min_length=3, max_length=64)
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Current GPS latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Current GPS longitude")
    altitude_m: Optional[float] = Field(None, description="Optional GPS altitude in meters")
    accuracy_m: Optional[float] = Field(None, ge=0.0, description="GPS horizontal accuracy radius")
    battery_pct: Optional[int] = Field(None, ge=0, le=100, description="Device battery percentage")
    sender_name: Optional[str] = Field("Prithvi Watch User", max_length=100)
    trigger_type: str = Field("PRESS_AND_HOLD_3S", description="Trigger mechanism")
    mode: str = Field("DEMO", description="'DEMO' or 'LIVE'")
    user_note: Optional[str] = Field(None, max_length=500)


class EmergencyService:
    """
    Thread-safe service for managing emergency contacts and SOS broadcasts.
    """
    def __init__(self):
        self._lock = threading.RLock()
        EMERGENCY_DIR.mkdir(parents=True, exist_ok=True)
        self._init_storage()

    def _init_storage(self):
        with self._lock:
            if not CONTACTS_FILE.exists():
                with open(CONTACTS_FILE, "w") as f:
                    json.dump({"contacts": []}, f, indent=2)
            if not SOS_EVENTS_FILE.exists():
                with open(SOS_EVENTS_FILE, "w") as f:
                    json.dump({"events": []}, f, indent=2)

    def _read_contacts(self) -> List[Dict[str, Any]]:
        with self._lock:
            try:
                with open(CONTACTS_FILE, "r") as f:
                    return json.load(f).get("contacts", [])
            except Exception:
                return []

    def _write_contacts(self, contacts: List[Dict[str, Any]]):
        with self._lock:
            temp_file = CONTACTS_FILE.with_suffix(".tmp")
            with open(temp_file, "w") as f:
                json.dump({"contacts": contacts}, f, indent=2)
            os.replace(temp_file, CONTACTS_FILE)

    def _read_events(self) -> List[Dict[str, Any]]:
        with self._lock:
            try:
                with open(SOS_EVENTS_FILE, "r") as f:
                    return json.load(f).get("events", [])
            except Exception:
                return []

    def _write_events(self, events: List[Dict[str, Any]]):
        with self._lock:
            temp_file = SOS_EVENTS_FILE.with_suffix(".tmp")
            with open(temp_file, "w") as f:
                json.dump({"events": events}, f, indent=2)
            os.replace(temp_file, SOS_EVENTS_FILE)

    @staticmethod
    def mask_phone(phone: str) -> str:
        cleaned = phone.strip()
        if len(cleaned) >= 10:
            return cleaned[:3] + "****" + cleaned[-4:]
        return "***"

    # CONTACT METHODS
    def get_contacts(self, device_id: str, mask: bool = False) -> List[Dict[str, Any]]:
        all_contacts = self._read_contacts()
        user_contacts = [c for c in all_contacts if c.get("device_id") == device_id]
        if not mask:
            return user_contacts
        
        # Return sanitized masked version
        return [
            {
                **c,
                "phone_number_masked": self.mask_phone(c["phone_number"]),
                "phone_number": self.mask_phone(c["phone_number"])
            }
            for c in user_contacts
        ]

    def add_contact(self, payload: EmergencyContactCreate) -> Dict[str, Any]:
        now_utc = datetime.now(timezone.utc).isoformat()
        contact_id = f"CNT-{uuid.uuid4().hex[:8].upper()}"

        with self._lock:
            contacts = self._read_contacts()
            # If set as primary, unmark others for this device
            if payload.is_primary:
                for c in contacts:
                    if c.get("device_id") == payload.device_id:
                        c["is_primary"] = False

            new_contact = {
                "id": contact_id,
                "device_id": payload.device_id,
                "name": payload.name.strip(),
                "phone_number": payload.phone_number,
                "relationship": payload.relationship,
                "is_primary": payload.is_primary,
                "is_verified": True, # Registered and validated
                "created_at": now_utc,
                "updated_at": now_utc
            }
            contacts.append(new_contact)
            self._write_contacts(contacts)
            return new_contact

    def update_contact(self, contact_id: str, payload: EmergencyContactUpdate, device_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        now_utc = datetime.now(timezone.utc).isoformat()
        with self._lock:
            contacts = self._read_contacts()
            target = None
            for c in contacts:
                if c["id"] == contact_id:
                    if device_id and c.get("device_id") != device_id:
                        continue
                    target = c
                    break

            if not target:
                return None

            if payload.name is not None:
                target["name"] = payload.name.strip()
            if payload.phone_number is not None:
                target["phone_number"] = payload.phone_number
            if payload.relationship is not None:
                target["relationship"] = payload.relationship
            if payload.is_primary is not None:
                if payload.is_primary:
                    for c in contacts:
                        if c.get("device_id") == target["device_id"]:
                            c["is_primary"] = False
                target["is_primary"] = payload.is_primary

            target["updated_at"] = now_utc
            self._write_contacts(contacts)
            return target

    def delete_contact(self, contact_id: str, device_id: Optional[str] = None) -> bool:
        with self._lock:
            contacts = self._read_contacts()
            initial_len = len(contacts)
            contacts = [
                c for c in contacts
                if not (c["id"] == contact_id and (device_id is None or c.get("device_id") == device_id))
            ]
            if len(contacts) < initial_len:
                self._write_contacts(contacts)
                return True
            return False

    # SOS METHODS
    def trigger_sos(self, payload: SOSEventCreate) -> Dict[str, Any]:
        now_dt = datetime.now(timezone.utc)
        now_utc = now_dt.isoformat()

        with self._lock:
            events = self._read_events()

            # Duplicate Prevention: Check for recent active SOS from this device within 30 seconds
            recent_threshold = now_dt - timedelta(seconds=30)
            for ev in reversed(events):
                if ev.get("device_id") == payload.device_id and ev.get("status") == "ACTIVE":
                    ev_time = datetime.fromisoformat(ev["created_at"])
                    if ev_time >= recent_threshold:
                        # Return existing active event with duplicate flag
                        return {
                            **ev,
                            "is_duplicate_suppressed": True,
                            "message": "Existing active SOS event within cooldown window. Duplicate suppressed."
                        }

            event_id = f"SOS-{now_dt.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
            
            # Fetch registered contacts for this device to simulate notification
            contacts = [c for c in self._read_contacts() if c.get("device_id") == payload.device_id]

            # Dispatch demo notifications
            notification_receipts = []
            for contact in contacts:
                receipt = demo_notification_provider.dispatch_alert(
                    event_id=event_id,
                    sender_name=payload.sender_name or "Prithvi Watch User",
                    latitude=payload.latitude,
                    longitude=payload.longitude,
                    recipient_phone=contact["phone_number"],
                    recipient_name=contact["name"],
                    message=payload.user_note,
                    is_demo=(payload.mode == "DEMO")
                )
                notification_receipts.append(receipt)

            sos_event = {
                "id": event_id,
                "device_id": payload.device_id,
                "latitude": payload.latitude,
                "longitude": payload.longitude,
                "altitude_m": payload.altitude_m,
                "accuracy_m": payload.accuracy_m,
                "battery_pct": payload.battery_pct,
                "status": "ACTIVE",
                "mode": payload.mode,
                "trigger_type": payload.trigger_type,
                "sender_name": payload.sender_name,
                "user_note": payload.user_note,
                "created_at": now_utc,
                "updated_at": now_utc,
                "resolved_at": None,
                "notified_contacts_count": len(notification_receipts),
                "notification_receipts": notification_receipts,
                "is_duplicate_suppressed": False
            }

            events.append(sos_event)
            self._write_events(events)
            return sos_event

    def get_sos_event(self, event_id: str) -> Optional[Dict[str, Any]]:
        events = self._read_events()
        for ev in events:
            if ev["id"] == event_id:
                return ev
        return None

    def cancel_sos(self, event_id: str, reason: str = "User cancelled") -> Optional[Dict[str, Any]]:
        now_utc = datetime.now(timezone.utc).isoformat()
        with self._lock:
            events = self._read_events()
            target = None
            for ev in events:
                if ev["id"] == event_id:
                    target = ev
                    break

            if not target:
                return None

            target["status"] = "CANCELLED"
            target["cancellation_reason"] = reason
            target["resolved_at"] = now_utc
            target["updated_at"] = now_utc
            self._write_events(events)
            return target

# Global emergency service singleton
emergency_service = EmergencyService()
