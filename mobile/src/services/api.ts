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
import { FloodAssessmentResponse } from '../types/flood';
import { LandslidePrediction } from '../types/landslide';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.42.219:8000';
const DEFAULT_TIMEOUT_MS = 12000;

/** Wraps fetch with a timeout. Throws a descriptive error on timeout. */
async function fetchWithTimeout(
  url: string,
  options?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (e: any) {
    if (e.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s: ${url}`);
    }
    throw new Error(`Network error: ${e.message || 'Unable to reach server'}`);
  } finally {
    clearTimeout(timer);
  }
}

/** Parses an error response body, returning the detail string or a fallback. */
async function extractError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === 'string') return body.detail;
    if (typeof body.detail === 'object') return JSON.stringify(body.detail);
    return fallback;
  } catch {
    return fallback;
  }
}

class PrithviApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // ─── HEALTH ──────────────────────────────────────────────────────────────

  async checkHealth(): Promise<{ status: string; service: string; version: string; mode: string; timestamp: string }> {
    const res = await fetchWithTimeout(`${this.baseUrl}/api/health`, { method: 'GET' }, 8000);
    if (!res.ok) {
      const msg = await extractError(res, `Health check failed (${res.status})`);
      throw new Error(msg);
    }
    return res.json();
  }

  // ─── LANDSLIDE ASSESSMENT ────────────────────────────────────────────────
  /**
   * Requests a real landslide hazard prediction from the backend.
   * NEVER returns invented data. Throws an error on non-2xx response.
   */
  async runPrediction(lat: number, lon: number): Promise<LandslidePrediction> {
    const url = `${this.baseUrl}/api/predictions/run`;
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: lat, longitude: lon }),
    });
    if (!res.ok) {
      const msg = await extractError(res, `Landslide prediction failed (${res.status})`);
      throw new Error(msg);
    }
    return res.json();
  }

  // ─── FLOOD ASSESSMENT ────────────────────────────────────────────────────

  /**
   * Requests a real flood assessment from the backend for the given coordinate.
   * NEVER returns invented data. If the call fails, throws an error.
   */
  async assessFlood(lat: number, lon: number): Promise<FloodAssessmentResponse> {
    const url = `${this.baseUrl}/api/floods/assess?lat=${lat}&lon=${lon}`;
    const res = await fetchWithTimeout(url, { method: 'GET' });
    if (!res.ok) {
      const msg = await extractError(res, `Flood assessment failed (${res.status})`);
      throw new Error(msg);
    }
    const data = await res.json();
    if (data.assessment.flood_probability < 0 || data.assessment.flood_probability > 1) {
      console.warn("DATA VALIDATION ERROR: flood_probability out of bounds 0-1");
    }
    if (data.data_confidence.completeness_pct < 0 || data.data_confidence.completeness_pct > 100) {
      console.warn("DATA VALIDATION ERROR: completeness_pct out of bounds 0-100");
    }
    return data;
  }

  // ─── COMBINED RISK ASSESSMENT ──────────────────────────────────────────────

  /**
   * Requests both flood and landslide assessments from existing endpoints.
   */
  async assessCombinedRisk(lat: number, lon: number): Promise<any> {
    try {
      const [landslide, flood] = await Promise.all([
        this.runPrediction(lat, lon),
        this.assessFlood(lat, lon)
      ]);
      
      return {
        location: { latitude: lat, longitude: lon },
        flood,
        landslide,
        assessedAt: new Date().toISOString()
      };
    } catch (e: any) {
      throw new Error(`Assessment failed: ${e.message}`);
    }
  }

  // ─── EMERGENCY CONTACTS ──────────────────────────────────────────────────

  async listContacts(deviceId: string, mask: boolean = false): Promise<EmergencyContact[]> {
    const url = `${this.baseUrl}/api/emergency/contacts?device_id=${encodeURIComponent(deviceId)}&mask=${mask}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      const msg = await extractError(res, `Failed to fetch contacts (${res.status})`);
      throw new Error(msg);
    }
    return res.json();
  }

  async addContact(payload: EmergencyContactCreatePayload): Promise<EmergencyContact> {
    const res = await fetchWithTimeout(`${this.baseUrl}/api/emergency/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const msg = await extractError(res, `Failed to add contact (${res.status})`);
      throw new Error(msg);
    }
    return res.json();
  }

  async pairContact(deviceId: string, pairingCode: string): Promise<EmergencyContact> {
    const res = await fetchWithTimeout(`${this.baseUrl}/api/emergency/contacts/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, pairing_code: pairingCode }),
    });
    if (!res.ok) {
      const msg = await extractError(res, `Pairing failed (${res.status})`);
      throw new Error(msg);
    }
    return res.json();
  }

  async updateContact(
    contactId: string,
    payload: EmergencyContactUpdatePayload,
    deviceId?: string
  ): Promise<EmergencyContact> {
    const qs = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
    const res = await fetchWithTimeout(
      `${this.baseUrl}/api/emergency/contacts/${contactId}${qs}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      const msg = await extractError(res, `Failed to update contact (${res.status})`);
      throw new Error(msg);
    }
    return res.json();
  }

  async deleteContact(contactId: string, deviceId?: string): Promise<boolean> {
    const qs = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
    const res = await fetchWithTimeout(
      `${this.baseUrl}/api/emergency/contacts/${contactId}${qs}`,
      { method: 'DELETE' }
    );
    if (!res.ok) {
      const msg = await extractError(res, `Failed to delete contact (${res.status})`);
      throw new Error(msg);
    }
    return true;
  }

  // ─── DEVICE TOKENS ───────────────────────────────────────────────────────

  async registerDeviceToken(payload: DeviceTokenRegisterPayload): Promise<any> {
    const res = await fetchWithTimeout(`${this.baseUrl}/api/emergency/devices/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const msg = await extractError(res, `Failed to register push token (${res.status})`);
      throw new Error(msg);
    }
    return res.json();
  }

  async listRegisteredDevices(deviceId?: string): Promise<any[]> {
    const qs = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
    const res = await fetchWithTimeout(`${this.baseUrl}/api/emergency/devices${qs}`);
    if (!res.ok) return [];
    return res.json();
  }

  // ─── SOS ─────────────────────────────────────────────────────────────────

  async triggerSOS(payload: SOSEventCreatePayload): Promise<SOSEvent> {
    const res = await fetchWithTimeout(
      `${this.baseUrl}/api/emergency/sos`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      20000 // longer timeout for SOS dispatch
    );
    if (!res.ok) {
      const msg = await extractError(res, `Failed to broadcast SOS (${res.status})`);
      throw new Error(msg);
    }
    return res.json();
  }

  async getSOSStatus(eventId: string): Promise<SOSEvent> {
    const res = await fetchWithTimeout(`${this.baseUrl}/api/emergency/sos/${eventId}`);
    if (!res.ok) {
      const msg = await extractError(res, `Failed to fetch SOS status (${res.status})`);
      throw new Error(msg);
    }
    return res.json();
  }

  async cancelSOS(
    eventId: string,
    reason?: string
  ): Promise<{ status: string; message: string; event: SOSEvent }> {
    const qs = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    const res = await fetchWithTimeout(
      `${this.baseUrl}/api/emergency/sos/${eventId}/cancel${qs}`,
      { method: 'POST' }
    );
    if (!res.ok) {
      const msg = await extractError(res, `Failed to cancel SOS (${res.status})`);
      throw new Error(msg);
    }
    return res.json();
  }

  // ─── EMERGENCY NOTIFICATIONS / TEST / RETRY ──────────────────────────────
  async testEmergencyContact(contactId: string, deviceId: string): Promise<any> {
    const res = await fetchWithTimeout(`${this.baseUrl}/api/emergency/contacts/${contactId}/test?device_id=${encodeURIComponent(deviceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Test alert failed (${res.status})`);
    }
    return res.json();
  }

  async retrySOS(eventId: string): Promise<any> {
    const res = await fetchWithTimeout(`${this.baseUrl}/api/emergency/sos/${eventId}/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Retry failed (${res.status})`);
    }
    return res.json();
  }

  // ─── NOTIFICATIONS ───────────────────────────────────────────────────────

  async acknowledgeNotification(
    receiptId: string,
    deviceId?: string
  ): Promise<{ status: string; receipt: NotificationReceipt }> {
    const qs = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
    const res = await fetchWithTimeout(
      `${this.baseUrl}/api/emergency/notifications/${receiptId}/ack${qs}`,
      { method: 'POST' }
    );
    if (!res.ok) {
      const msg = await extractError(res, `Failed to acknowledge notification (${res.status})`);
      throw new Error(msg);
    }
    return res.json();
  }

  async getDemoNotifications(limit: number = 20): Promise<DemoNotificationsResponse> {
    const res = await fetchWithTimeout(
      `${this.baseUrl}/api/emergency/notifications/demo?limit=${limit}`
    );
    if (!res.ok) {
      const msg = await extractError(res, `Failed to fetch demo notifications (${res.status})`);
      throw new Error(msg);
    }
    return res.json();
  }
}

export const api = new PrithviApiClient();

// Backwards-compatible alias for existing code that imports `emergencyApi`
export const emergencyApi = api;
