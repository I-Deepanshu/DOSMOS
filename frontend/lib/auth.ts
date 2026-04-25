import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

// In-memory access token store — never persisted to localStorage
let _accessToken: string | null = null;

export function setAccessToken(token: string) {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export function clearAccessToken() {
  _accessToken = null;
}

export function getAuthHeader(): Record<string, string> {
  return _accessToken ? { Authorization: `Bearer ${_accessToken}` } : {};
}

export interface AuthUser {
  id: string;
  name: string;
  role: "admin" | "user";
  planet?: {
    name: string;
    slug: string;
    type: string;
    color: string;
    orbitIndex: number;
    size: number;
  };
}

let _user: AuthUser | null = null;

export function setUser(user: AuthUser) { _user = user; }
export function getUser(): AuthUser | null { return _user; }
export function clearUser() { _user = null; }

// ── Session cookie (readable by Next.js middleware on Vercel domain) ──────────
// The HttpOnly refreshToken lives on the backend domain and is invisible here.
// We write a lightweight non-HttpOnly "dosmos_session" cookie on the FRONTEND
// domain so the Next.js middleware can detect an authenticated state.

export function setSessionCookie() {
  const isProd = window.location.protocol === "https:";
  const maxAge = 7 * 24 * 60 * 60; // 7 days, matching refreshToken TTL
  document.cookie = [
    "dosmos_session=1",
    "path=/",
    `max-age=${maxAge}`,
    isProd ? "secure" : "",
    isProd ? "samesite=none" : "samesite=lax",
  ].filter(Boolean).join("; ");
}

export function clearSessionCookie() {
  document.cookie = "dosmos_session=; path=/; max-age=0";
}

// ── Silent session bootstrap ───────────────────────────────────────────────
// Called on page load. If the dosmos_session cookie exists the refresh endpoint
// will return a fresh accessToken + user without the user having to re-login.
export async function bootstrapSession(): Promise<boolean> {
  if (typeof document === "undefined") return false;
  const hasCookie = document.cookie.split(";").some((c) => c.trim().startsWith("dosmos_session="));
  if (!hasCookie) return false;
  if (_accessToken) return true; // already have a valid token in memory
  try {
    const { data } = await axios.post(
      `${BASE_URL}/api/auth/refresh`,
      {},
      { withCredentials: true }
    );
    setAccessToken(data.accessToken);
    if (data.user) setUser(data.user);
    return true;
  } catch {
    // Refresh token expired or invalid — clear stale cookie so middleware redirects
    clearSessionCookie();
    return false;
  }
}

// ── Shared logout utility ──────────────────────────────────────────────────
export async function performLogout(): Promise<void> {
  try {
    await axios.post(
      `${BASE_URL}/api/auth/logout`,
      {},
      {
        withCredentials: true,
        headers: _accessToken ? { Authorization: `Bearer ${_accessToken}` } : {},
      }
    );
  } catch {
    // Ignore errors — we clear local state regardless
  } finally {
    clearAccessToken();
    clearUser();
    clearSessionCookie();
  }
}

