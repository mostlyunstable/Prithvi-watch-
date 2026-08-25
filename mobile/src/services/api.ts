import {
  EmergencyContact,
  EmergencyContactCreatePayload,
  EmergencyContactUpdatePayload,
  DeviceTokenRegisterPayload,
  SOSEvent,
  SOSEventCreatePayload,
  DemoNotificationsResponse,
  NotificationReceipt
} from '../types/emergency';

const BASE_URL = 'http://127.0.0.1:8000';

export class EmergencyApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // 1. CONTACTS
  async listContacts(deviceId: string, mask: boolean = false): Promise<EmergencyContact[]> {
    const res = await fetch(`${this.baseUrl}/api/emergency/contacts?device_id=${encodeURIComponent(deviceId)}&mask=${mask}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to fetch contacts (${res.status})`);
    }
    return res.json();
  }

  async addContact(payload: EmergencyContactCreatePayload): Promise<EmergencyContact> {
    const res = await fetch(`${this.baseUrl}/api/emergency/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to add contact (${res.status})`);
    }
    return res.json();
  }

  async updateContact(
    contactId: string,
    payload: EmergencyContactUpdatePayload,
    deviceId?: string
  ): Promise<EmergencyContact> {
    const url = deviceId
      ? `${this.baseUrl}/api/emergency/contacts/${contactId}?device_id=${encodeURIComponent(deviceId)}`
      : `${this.baseUrl}/api/emergency/contacts/${contactId}`;

    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to update contact (${res.status})`);
    }
    return res.json();
  }

  async deleteContact(contactId: string, deviceId?: string): Promise<boolean> {
    const url = deviceId
      ? `${this.baseUrl}/api/emergency/contacts/${contactId}?device_id=${encodeURIComponent(deviceId)}`
      : `${this.baseUrl}/api/emergency/contacts/${contactId}`;

    const res = await fetch(url, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to delete contact (${res.status})`);
    }
    return true;
  }

  // 2. DEVICE TOKENS (PHONE B REGISTRATION)
  async registerDeviceToken(payload: DeviceTokenRegisterPayload): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/emergency/devices/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to register push token (${res.status})`);
    }
    return res.json();
  }

  async listRegisteredDevices(deviceId?: string): Promise<any[]> {
    const url = deviceId
      ? `${this.baseUrl}/api/emergency/devices?device_id=${encodeURIComponent(deviceId)}`
      : `${this.baseUrl}/api/emergency/devices`;
    const res = await fetch(url);
    if (!res.ok) {
      return [];
    }
    return res.json();
  }

  // 3. SOS BROADCAST (PHONE A -> BACKEND -> PHONE B)
  async triggerSOS(payload: SOSEventCreatePayload): Promise<SOSEvent> {
    const res = await fetch(`${this.baseUrl}/api/emergency/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to broadcast SOS (${res.status})`);
    }
    return res.json();
  }

  async getSOSStatus(eventId: string): Promise<SOSEvent> {
    const res = await fetch(`${this.baseUrl}/api/emergency/sos/${eventId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to fetch SOS status (${res.status})`);
    }
    return res.json();
  }

  async cancelSOS(eventId: string, reason?: string): Promise<{ status: string; message: string; event: SOSEvent }> {
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    const res = await fetch(`${this.baseUrl}/api/emergency/sos/${eventId}/cancel${query}`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to cancel SOS (${res.status})`);
    }
    return res.json();
  }

  // 4. NOTIFICATION ACKNOWLEDGMENT (PHONE B ACK)
  async acknowledgeNotification(receiptId: string, deviceId?: string): Promise<{ status: string; receipt: NotificationReceipt }> {
    const query = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
    const res = await fetch(`${this.baseUrl}/api/emergency/notifications/${receiptId}/ack${query}`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to acknowledge notification (${res.status})`);
    }
    return res.json();
  }

  async getDemoNotifications(limit: number = 20): Promise<DemoNotificationsResponse> {
    const res = await fetch(`${this.baseUrl}/api/emergency/notifications/demo?limit=${limit}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to fetch demo notifications (${res.status})`);
    }
    return res.json();
  }
}

export const emergencyApi = new EmergencyApiClient();
