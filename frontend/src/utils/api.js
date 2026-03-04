import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({ baseURL: API_URL });

// Inject JWT token on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────
export const register = (data) => api.post("/api/auth/register", data);
export const login    = (data) => api.post("/api/auth/login", data);

// ── Emails ───────────────────────────────────────────────────────────
export const generateEmail = (data) => api.post("/api/emails/generate", data);
export const getHistory    = (limit = 20) => api.get(`/api/emails/history?limit=${limit}`);
export const getQuota      = () => api.get("/api/emails/quota");
export const startBulkJob  = (data) => api.post("/api/emails/bulk", data);
export const getBulkStatus = (jobId) => api.get(`/api/emails/bulk/${jobId}`);

// ── Users ─────────────────────────────────────────────────────────────
export const getProfile      = () => api.get("/api/users/me");
export const createCheckout  = (data) => api.post("/api/users/billing/checkout", data);
export const getBillingPortal = (return_url) => api.post("/api/users/billing/portal", { return_url });

export default api;
