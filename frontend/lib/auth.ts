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
