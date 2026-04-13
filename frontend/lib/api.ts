const FALLBACK_API_BASE_URL = "http://127.0.0.1:8000";

export class ApiRequestError extends Error {
  status: number;

  constructor(path: string, status: number) {
    super(`API request failed for ${path}: ${status}`);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export type ApiStatus = {
  online: boolean;
  label: string;
};

export type AuthToken = {
  access_token: string;
  token_type: string;
  user_id: string;
  display_name: string;
  roles: string[];
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  display_name: string;
  first_name: string;
  last_name: string | null;
  location_id: string | null;
  barber_id: string | null;
  last_login_at: string | null;
  roles: string[];
};

export type WhatsAppMessageSummary = {
  id: string;
  conversation_id: string | null;
  customer_id: string | null;
  appointment_id: string | null;
  direction: string;
  status: string;
  kind: string;
  provider_name: string;
  provider_message_id: string | null;
  body: string | null;
  created_at: string;
};

export type ConversationStateSummary = {
  id: string;
  customer_id: string;
  whatsapp_chat_id: string;
  state: string;
  active_intent: string;
  handed_off_to_human: boolean;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
};

export type ReminderJobSummary = {
  id: string;
  appointment_id: string;
  reminder_type: string;
  status: string;
  scheduled_for: string;
  attempts: number;
  processed_at: string | null;
};

export type AppointmentSummary = {
  id: string;
  customer_id: string;
  barber_id: string | null;
  resource_id: string | null;
  service_id: string;
  conversation_id: string | null;
  source: string;
  status: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  reserved_start_at: string;
  reserved_end_at: string;
  notes: string | null;
  internal_notes: string | null;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type AppointmentPayload = {
  customer_id: string;
  service_id: string;
  barber_id?: string | null;
  resource_id?: string | null;
  conversation_id?: string | null;
  source?: string;
  status?: string;
  scheduled_start_at: string;
  scheduled_end_at?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
};

export type BarberSummary = {
  id: string;
  location_id: string | null;
  code: string;
  first_name: string;
  last_name: string | null;
  display_name: string;
  email: string | null;
  phone_e164: string | null;
  time_zone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type BarberPayload = {
  location_id?: string | null;
  code?: string;
  first_name?: string;
  last_name?: string | null;
  display_name?: string | null;
  email?: string | null;
  phone_e164?: string | null;
  time_zone?: string;
  is_active?: boolean;
};

export type BarberWorkingHoursSummary = {
  id: string;
  barber_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type BarberWorkingHoursPayload = {
  weekday?: number;
  start_time?: string;
  end_time?: string;
  is_active?: boolean;
};

export type BarberTimeOffSummary = {
  id: string;
  barber_id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  is_all_day: boolean;
  created_at: string;
  updated_at: string;
};

export type BarberTimeOffPayload = {
  starts_at?: string;
  ends_at?: string;
  reason?: string | null;
  is_all_day?: boolean;
};

export type ServiceSummary = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  requires_barber: boolean;
  requires_resource: boolean;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  price_cents: number | null;
  currency_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ServicePayload = {
  code?: string;
  name?: string;
  description?: string | null;
  requires_barber?: boolean;
  requires_resource?: boolean;
  duration_minutes?: number;
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
  price_cents?: number | null;
  currency_code?: string;
  is_active?: boolean;
};

export type CustomerSummary = {
  id: string;
  whatsapp_phone_e164: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  preferred_barber_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type StaffCustomerSummary = CustomerSummary;

export type StaffConversationSummary = {
  id: string;
  customer_id: string;
  whatsapp_chat_id: string;
  state: string;
  active_intent: string;
  handed_off_to_human: boolean;
  assigned_staff_user_id: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SystemUserSummary = {
  id: string;
  location_id: string | null;
  barber_id: string | null;
  email: string;
  first_name: string;
  last_name: string | null;
  display_name: string;
  phone_e164: string | null;
  is_active: boolean;
  roles: string[];
  created_at: string;
  updated_at: string;
};

export type SystemUserPayload = {
  location_id?: string | null;
  barber_id?: string | null;
  email?: string;
  password?: string | null;
  first_name?: string;
  last_name?: string | null;
  display_name?: string;
  phone_e164?: string | null;
  is_active?: boolean;
  roles?: string[];
};

async function fetchWithTimeout(input: string, init?: RequestInit, timeoutMs = 2500): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || FALLBACK_API_BASE_URL).replace(/\/$/, "");
}

export function getServerApiBaseUrl(): string {
  return getApiBaseUrl();
}

export async function fetchApiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithTimeout(`${getServerApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiRequestError(path, response.status);
  }

  return response.json() as Promise<T>;
}

export async function fetchApiJsonWithToken<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  return fetchApiJson<T>(path, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function getApiStatus(): Promise<ApiStatus> {
  try {
    const response = await fetchWithTimeout(`${getServerApiBaseUrl()}/api/health`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return { online: false, label: `API ${response.status}` };
    }

    return { online: true, label: "API online" };
  } catch {
    return { online: false, label: "API offline" };
  }
}

export async function loginDevStaff(): Promise<AuthToken | null> {
  const email = process.env.SUNBRONZE_DEV_EMAIL || "admin@sunbronze.local";
  const password = process.env.SUNBRONZE_DEV_PASSWORD || "phase4-runtime";

  try {
    return await fetchApiJson<AuthToken>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return null;
  }
}

export async function fetchProtectedApiJson<T>(path: string): Promise<T | null> {
  const auth = await loginDevStaff();
  if (!auth) {
    return null;
  }

  try {
    return await fetchApiJson<T>(path, {
      headers: {
        Authorization: `Bearer ${auth.access_token}`,
      },
    });
  } catch {
    return null;
  }
}
