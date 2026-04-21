export interface Profile {
  id: string;
  business_name: string;
  contact_name: string;
  phone: string;
  email: string;
  signalwire_project_id: string;
  signalwire_api_token: string;
  signalwire_space: string;
  setup_completed: boolean;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface PhoneNumber {
  id: string;
  user_id: string;
  number: string;
  friendly_name: string;
  signalwire_sid: string;
  capabilities: { sms: boolean; mms: boolean; voice: boolean };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  user_id: string;
  phone_number_id: string | null;
  direction: "inbound" | "outbound";
  from_number: string;
  to_number: string;
  contact_phone: string;
  body: string;
  status: "pending" | "queued" | "sent" | "delivered" | "failed" | "received" | "undelivered";
  signalwire_sid: string;
  segments: number;
  error_code: string;
  error_message: string;
  received_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Webhook {
  id: string;
  user_id: string;
  phone_number_id: string | null;
  name: string;
  url: string;
  is_active: boolean;
  secret: string;
  retry_count: number;
  last_triggered_at: string | null;
  last_status: number | null;
  created_at: string;
  updated_at: string;
}

export interface OptOut {
  id: string;
  user_id: string;
  phone_number: string;
  opted_out_at: string;
  opted_in_at: string | null;
  is_active: boolean;
  source: "reply" | "manual" | "import";
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  user_id: string;
  name: string;
  body: string;
  category: "marketing" | "transactional" | "reminder" | "support";
  use_count: number;
  created_at: string;
  updated_at: string;
}
