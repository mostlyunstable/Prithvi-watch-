"""
PRITHVI WATCH — Emergency & SOS API Router.

Exposes REST endpoints for:
- Emergency Contacts CRUD
- SOS Broadcast / Trigger & Duplicate Prevention
- SOS Event Status & Cancellation
- Demo Notification Receipts
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.services.emergency import (
    emergency_service,
    EmergencyContactCreate,
    EmergencyContactUpdate,
    SOSEventCreate
)
from app.services.notifications import demo_notification_provider

router = APIRouter(prefix="/api/emergency", tags=["Emergency / SOS"])


# 1. EMERGENCY CONTACTS
@router.get("/contacts", response_model=List[dict])
def list_contacts(
    device_id: str = Query(..., min_length=3, max_length=64, description="Client or device ID"),
    mask: bool = Query(False, description="Whether to mask sensitive phone numbers")
):
    """Retrieve all registered emergency contacts for a given device."""
    return emergency_service.get_contacts(device_id=device_id, mask=mask)


@router.post("/contacts", status_code=status.HTTP_201_CREATED)
def create_contact(payload: EmergencyContactCreate):
    """Register a new emergency contact with input validation."""
    return emergency_service.add_contact(payload)


@router.put("/contacts/{contact_id}")
def update_contact(
    contact_id: str,
    payload: EmergencyContactUpdate,
    device_id: Optional[str] = Query(None, description="Optional device ID ownership check")
):
    """Update an existing emergency contact."""
    updated = emergency_service.update_contact(contact_id=contact_id, payload=payload, device_id=device_id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact '{contact_id}' not found or does not match device ID."
        )
    return updated


@router.delete("/contacts/{contact_id}")
def delete_contact(
    contact_id: str,
    device_id: Optional[str] = Query(None, description="Optional device ID ownership check")
):
    """Delete an emergency contact."""
    success = emergency_service.delete_contact(contact_id=contact_id, device_id=device_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact '{contact_id}' not found."
        )
    return {"status": "success", "message": f"Contact '{contact_id}' deleted."}


# 2. SOS BROADCASTS
@router.post("/sos", status_code=status.HTTP_201_CREATED)
def trigger_sos(payload: SOSEventCreate):
    """
    Trigger an emergency SOS event.
    - Validates GPS coordinates
    - Rate-limits and prevents rapid duplicates within cooldown window
    - Dispatches simulated demo notifications to registered contacts
    - Persists SOS event
    """
    if abs(payload.latitude) > 90.0 or abs(payload.longitude) > 180.0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Coordinates out of valid WGS-84 range [-90, 90], [-180, 180]."
        )
    return emergency_service.trigger_sos(payload)


@router.get("/sos/{event_id}")
def get_sos_status(event_id: str):
    """Retrieve details and activation status of an SOS event."""
    event = emergency_service.get_sos_event(event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SOS event '{event_id}' not found."
        )
    return event


@router.post("/sos/{event_id}/cancel")
def cancel_sos(
    event_id: str,
    reason: str = Query("User cancelled via mobile app", max_length=200)
):
    """Cancel an active SOS event."""
    cancelled = emergency_service.cancel_sos(event_id=event_id, reason=reason)
    if not cancelled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SOS event '{event_id}' not found."
        )
    return {
        "status": "cancelled",
        "message": f"SOS event '{event_id}' has been cancelled.",
        "event": cancelled
    }


# 3. DEMO NOTIFICATIONS VIEWER
@router.get("/notifications/demo")
def get_demo_notifications(limit: int = Query(20, ge=1, le=100)):
    """
    Inspect recently simulated demo notifications.
    Includes explicit safety disclaimers for demo and judging review.
    """
    notifications = demo_notification_provider.get_recent_notifications(limit=limit)
    return {
        "is_demo": True,
        "disclaimer": "DEMO SIMULATION ONLY — No real emergency messages sent.",
        "total_returned": len(notifications),
        "notifications": notifications
    }
