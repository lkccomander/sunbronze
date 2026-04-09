const FALLBACK_API_BASE_URL = "http://127.0.0.1:8000";

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
