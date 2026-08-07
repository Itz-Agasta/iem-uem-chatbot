// Central place for the backend base URL. Change this to your college
// server's address once deployed (e.g. "http://192.168.1.50:8000").
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface EventBannerContent {
  title: string;
  subtitle: string;
  image_url: string;
}

export interface KioskContent {
  top_ticker: string[];
  bottom_ticker: string[];
  event: EventBannerContent;
}

export async function fetchContent(): Promise<KioskContent> {
  const res = await fetch(`${API_BASE_URL}/content`);
  if (!res.ok) throw new Error(`Failed to fetch content (${res.status})`);
  return res.json();
}

export async function askQuestion(question: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(`Backend error (${res.status})`);
  const data = await res.json();
  return data.answer;
}

/** Resolves a possibly-relative image URL (e.g. "/uploads/xyz.jpg") returned
 * by the backend into a full URL pointing at the backend server. */
export function resolveImageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url}`;
}

// --- Admin API -----------------------------------------------------------------
export async function adminLogin(username: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Invalid username or password");
  const data = await res.json();
  return data.access_token as string;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function updateTickers(
  token: string,
  top_ticker: string[] | null,
  bottom_ticker: string[] | null
): Promise<KioskContent> {
  const res = await fetch(`${API_BASE_URL}/admin/content/tickers`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ top_ticker, bottom_ticker }),
  });
  if (!res.ok) throw new Error(`Failed to update tickers (${res.status})`);
  return res.json();
}

export async function updateEventText(
  token: string,
  title: string | null,
  subtitle: string | null
): Promise<KioskContent> {
  const res = await fetch(`${API_BASE_URL}/admin/content/event`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ title, subtitle }),
  });
  if (!res.ok) throw new Error(`Failed to update event (${res.status})`);
  return res.json();
}

export async function uploadEventImage(token: string, file: File): Promise<KioskContent> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE_URL}/admin/content/event/image`, {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to upload image (${res.status})`);
  }
  return res.json();
}

export async function refreshBackendIndex(token: string): Promise<{ status: string; chunk_count: number }> {
  const res = await fetch(`${API_BASE_URL}/admin/refresh-index`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Failed to refresh index (${res.status})`);
  return res.json();
}
