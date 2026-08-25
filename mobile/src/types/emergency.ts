/**
 * PRITHVI WATCH — Mobile Emergency & SOS Types
 */

export type RelationshipType =
  | 'Family'
  | 'Parent'
  | 'Spouse'
  | 'Sibling'
  | 'Child'
  | 'Friend'
  | 'Doctor'
  | 'Local Authority'
  | 'Neighbor'
  | 'Colleague'
  | 'Other';

export interface EmergencyContact {
  id: string;
  device_id: string;
  name: string;
  phone_number: string;
  phone_number_masked?: string;
  relationship: RelationshipType | string;
  is_primary: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmergencyContactCreatePayload {
  device_id: string;
  name: string;
  phone_number: string;
  relationship: string;
  is_primary?: boolean;
}

export interface EmergencyContactUpdatePayload {
  name?: string;
  phone_number?: string;
  relationship?: string;
  is_primary?: boolean;
}

export interface NotificationReceipt {
  notification_id: string;
  event_id: string;
  recipient_name: string;
  recipient_phone_masked: string;
  channel: string;
  is_demo: boolean;
  status: string;
  timestamp: string;
  formatted_message: string;
  disclaimer: string;
}

export interface SOSEvent {
  id: string;
  device_id: string;
  latitude: number;
  longitude: number;
  altitude_m?: number | null;
  accuracy_m?: number | null;
  battery_pct?: number | null;
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED';
  mode: 'DEMO' | 'LIVE';
  trigger_type: string;
  sender_name?: string | null;
  user_note?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  cancellation_reason?: string | null;
  notified_contacts_count: number;
  notification_receipts: NotificationReceipt[];
  is_duplicate_suppressed: boolean;
}

export interface SOSEventCreatePayload {
  device_id: string;
  latitude: number;
  longitude: number;
  altitude_m?: number;
  accuracy_m?: number;
  battery_pct?: number;
  sender_name?: string;
  trigger_type?: string;
  mode?: 'DEMO' | 'LIVE';
  user_note?: string;
}

export interface DemoNotificationsResponse {
  is_demo: boolean;
  disclaimer: string;
  total_returned: number;
  notifications: NotificationReceipt[];
}
