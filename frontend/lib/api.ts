import axios from "axios";
import { getAccessToken, setAccessToken } from "./auth";
import { refreshSocketAuth } from "./socket";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true, // send cookies (refreshToken, canRegister)
});

// ── Request interceptor: attach access token ──────────────────────────────────
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: silent refresh on 401 ───────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post(
          `${BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );
        setAccessToken(data.accessToken);
        refreshSocketAuth(data.accessToken); // re-auth socket
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        // Refresh failed → redirect to login
        if (typeof window !== "undefined") window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
