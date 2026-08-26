"""
PRITHVI WATCH — Emergency & SOS API Router (Phase 2: Multi-Device Real Push).

Exposes REST endpoints for:
1. Emergency Contacts CRUD
2. Device Push Token Registration & Management (Phone B)
3. Multi-Device SOS Triggering (Phone A -> SOS -> Backend -> Phone B Push)
4. Push Notification Acknowledgment & Status Inspection
5. Demo Notification Receipts Stream
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.services.emergency import (
    emergency_service,
    EmergencyContactCreate,
    EmergencyContactUpdate,
    DeviceTokenRegisterRequest,
    SOSEventCreate
)
from app.services.notifications import demo_notification_provider

router = APIRouter(prefix="/api/emergency", tags=["Emergency / SOS"])


# ============================================================================
# 1. EMERGENCY CONTACTS CRUD
# ============================================================================

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



@router.post("/contacts/{contact_id}/test")
def test_contact_alert(contact_id: str, device_id: str = Query(..., description="Device ID ownership check")):
    """Send a test alert connectivity check to a registered contact without an active SOS event."""
    contacts = emergency_service.get_contacts(device_id=device_id, mask=False)
    contact = next((c for c in contacts if c["id"] == contact_id), None)
    
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact '{contact_id}' not found for device."
        )
        
    from app.services.notifications import sms_notification_provider
    
    receipt = sms_notification_provider.dispatch_alert(
        event_id="TEST-" + contact_id,
        sender_name="Prithvi Watch User",
        latitude=0.0,
        longitude=0.0,
        recipient_phone=contact["phone_number"],
        recipient_name=contact["name"],
        is_demo=True  # Force demo format for test alerts
    )
    
    return {
        "status": "success",
        "message": "Test alert dispatched.",
        "receipt": receipt
    }

class ContactPairRequest(BaseModel):
    device_id: str = Field(..., min_length=3, max_length=64)
    pairing_code: str = Field(..., min_length=6, max_length=12)


@router.post("/contacts/pair")
def pair_contact(payload: ContactPairRequest):
    """
    Pair a responder's device ID with an existing contact using a pairing code.
    Sets is_verified = True and links the device.
    """
    try:
        updated = emergency_service.pair_contact(
            responder_device_id=payload.device_id,
            pairing_code=payload.pairing_code
        )
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid pairing code. Contact not found."
            )
        return updated
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ============================================================================
# 2. DEVICE PUSH TOKEN REGISTRATION (PHONE B)
# ============================================================================

@router.post("/devices/register", status_code=status.HTTP_201_CREATED)
def register_device_push_token(payload: DeviceTokenRegisterRequest):
    """
    Register or update an Expo push token for Phone B (Responder device).
    Associates the push token with device ID and optional responder phone profile.
    """
    return emergency_service.register_device_token(payload)


@router.get("/devices", response_model=List[dict])
def list_registered_devices(device_id: Optional[str] = Query(None)):
    """List registered push devices and tokens."""
    return emergency_service.get_registered_tokens(device_id=device_id)


@router.delete("/devices/{push_token}")
def unregister_device_push_token(push_token: str):
    """Deactivate/unregister a push token."""
    success = emergency_service.unregister_token(push_token)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Push token not found."
        )
    return {"status": "success", "message": "Push token deactivated."}


# ============================================================================
# 3. MULTI-DEVICE SOS BROADCASTS (PHONE A -> BACKEND -> PHONE B)
# ============================================================================

@router.post("/sos", status_code=status.HTTP_201_CREATED)
def trigger_sos(payload: SOSEventCreate):
    """
    Trigger an emergency SOS event from Phone A.
    - Validates GPS coordinates
    - Rate-limits and prevents rapid duplicates
    - Dispatches REAL push notifications to registered Phone B devices
    - Dispatches in-app demo receipts
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
    """Retrieve details, activation state, and notification receipts of an SOS event."""
    event = emergency_service.get_sos_event(event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SOS event '{event_id}' not found."
        )
    return event



@router.post("/sos/{event_id}/retry")
def retry_failed_alerts(event_id: str):
    updated = emergency_service.retry_failed_alerts(event_id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event {event_id} not found."
        )
    return updated

@router.post("/sos/{event_id}/cancel")
def cancel_sos(
    event_id: str,
    reason: str = Query("User cancelled via mobile app", max_length=200)
):
    """Cancel / stand down an active SOS event."""
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


# ============================================================================
# 4. NOTIFICATION ACKNOWLEDGMENT & STATUS TRACKING (PHONE B)
# ============================================================================

@router.post("/notifications/{receipt_id}/ack")
def acknowledge_push_notification(
    receipt_id: str,
    device_id: Optional[str] = Query(None, description="Responder device acknowledging receipt")
):
    """Called by Phone B when an emergency push notification is received/opened."""
    receipt = emergency_service.acknowledge_notification(receipt_id, responder_device_id=device_id)
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification receipt '{receipt_id}' not found."
        )
    return {
        "status": "acknowledged",
        "message": f"Receipt '{receipt_id}' marked as ACKNOWLEDGED.",
        "receipt": receipt
    }


@router.get("/notifications/demo")
def get_demo_notifications(limit: int = Query(20, ge=1, le=100)):
    """
    Inspect recently simulated demo notifications with explicit safety disclaimers.
    """
    notifications = demo_notification_provider.get_recent_notifications(limit=limit)
    return {
        "is_demo": True,
        "disclaimer": "DEMO SIMULATION ONLY — No real emergency messages sent.",
        "total_returned": len(notifications),
        "notifications": notifications
    }
