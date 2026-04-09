const FALLBACK_API_BASE_URL = "http://127.0.0.1:8000";

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

export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || FALLBACK_API_BASE_URL).replace(/\/$/, "");
}

export function getServerApiBaseUrl(): string {
  return getApiBaseUrl();
}

export async function fetchApiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getServerApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed for ${path}: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getApiStatus(): Promise<ApiStatus> {
  try {
    const response = await fetch(`${getServerApiBaseUrl()}/api/health`, {
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
