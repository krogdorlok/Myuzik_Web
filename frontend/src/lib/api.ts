import type {
  TokenResponse,
  PredictionResult,
  HistoryResponse,
  TasteProfile,
  ApiError,
  User,
} from "@/types";

const API_BASE = "/api/proxy";

function toQuery(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  return new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail);
  }

  return response.json();
}

export const api = {
  auth: {
    register: (name: string, email: string, password: string) =>
      apiRequest<TokenResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      }),

    login: (email: string, password: string) =>
      apiRequest<TokenResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),

    me: () => apiRequest<User>("/auth/me"),
  },

  predict: {
    upload: async (file: File, filename?: string): Promise<PredictionResult> => {
      const formData = new FormData();
      formData.append("file", file);
      if (filename) {
        formData.append("filename_hint", filename);
      }

      const response = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(error.detail);
      }

      return response.json();
    },
  },

  history: {
    list: (params?: { genre?: string; limit?: number; offset?: number }) =>
      apiRequest<HistoryResponse>(`/history${params ? "?" + toQuery(params) : ""}`),

    delete: (id: string) => apiRequest<void>(`/history/${id}`, { method: "DELETE" }),
  },

  insights: {
    tasteProfile: () => apiRequest<TasteProfile>("/insights/taste-profile"),
  },
};
