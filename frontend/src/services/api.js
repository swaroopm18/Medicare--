// Central place where the frontend talks to the MediCare backend.
// Every other file should go through the `api` object below instead of
// calling fetch() directly, so the base URL, auth header, and error
// handling are consistent everywhere.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const TOKEN_KEY = "medicare_token_v1";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body, isFormData = false, auth = true } = {}) {
  const headers = {};
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "Can't reach the MediCare server. Make sure the backend is running and VITE_API_BASE_URL is correct.",
      0
    );
  }

  if (res.status === 204) return null;

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const detail =
      (data && (data.detail || data.message)) ||
      (Array.isArray(data?.detail) ? data.detail.map((d) => d.msg).join(", ") : null) ||
      res.statusText ||
      "Something went wrong.";
    throw new ApiError(typeof detail === "string" ? detail : JSON.stringify(detail), res.status);
  }

  return data;
}

export const api = {
  auth: {
    register: (payload) => request("/api/auth/register", { method: "POST", body: payload, auth: false }),
    login: (payload) => request("/api/auth/login", { method: "POST", body: payload, auth: false }),
    me: () => request("/api/auth/me"),
    updatePreferences: (payload) => request("/api/auth/me/preferences", { method: "PATCH", body: payload }),
    logout: () => request("/api/auth/logout", { method: "POST" }),
  },
  medicines: {
    list: () => request("/api/medicines"),
    create: (payload) => request("/api/medicines", { method: "POST", body: payload }),
    update: (id, payload) => request(`/api/medicines/${id}`, { method: "PATCH", body: payload }),
    remove: (id) => request(`/api/medicines/${id}`, { method: "DELETE" }),
    doseAction: (payload) => request("/api/medicines/dose-action", { method: "POST", body: payload }),
    dashboardSummary: () => request("/api/medicines/dashboard-summary"),
  },
  interactions: {
    check: (payload) => request("/api/interactions/check", { method: "POST", body: payload }),
  },
  knowledge: {
    search: (q) => request(`/api/knowledge-base/search?q=${encodeURIComponent(q || "")}`),
  },
  dosage: {
    calculate: (payload) => request("/api/dosage/calculate", { method: "POST", body: payload }),
  },
  scanner: {
    upload: (file) => {
      const form = new FormData();
      form.append("file", file);
      return request("/api/scanner/upload", { method: "POST", body: form, isFormData: true });
    },
    confirm: (payload) => request("/api/scanner/confirm", { method: "POST", body: payload }),
  },
  assistant: {
    chat: (message) => request("/api/assistant/chat", { method: "POST", body: { message } }),
    history: () => request("/api/assistant/history"),
  },
  reports: {
    adherence: () => request("/api/reports/adherence"),
    history: (limit = 20) => request(`/api/reports/history?limit=${limit}`),
  },
};

export { ApiError };
