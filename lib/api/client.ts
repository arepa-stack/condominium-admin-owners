import axios, { AxiosError } from "axios";
import { API_BASE_URL } from "@/lib/utils/constants";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(undefined);
    }
  });
  failedQueue = [];
};

const clearAuthAndRedirect = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_data");
    localStorage.removeItem("selected_unit_id");
    if (window.location.pathname !== "/login") {
      window.location.href = "/login?expired=true";
    }
  }
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || "";

    if (error.response?.status === 401 && !url.includes("/auth/refresh") && !url.includes("/auth/login")) {
      if (typeof window !== "undefined" && window.location.pathname === "/login") {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest!))
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;
      const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;

      if (!refreshToken) {
        clearAuthAndRedirect();
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const newAccessToken = data.access_token || data.token?.access_token;
        if (newAccessToken) {
          localStorage.setItem("access_token", newAccessToken);
          if (data.refresh_token || data.token?.refresh_token) {
            localStorage.setItem("refresh_token", data.refresh_token || data.token?.refresh_token);
          }
          processQueue(null);
          isRefreshing = false;
          return apiClient(originalRequest!);
        } else {
          throw new Error("No new access token");
        }
      } catch (refreshError) {
        processQueue(refreshError as AxiosError);
        clearAuthAndRedirect();
        isRefreshing = false;
        return Promise.reject(refreshError);
      }
    }

    const message = error.response?.data
      ? (error.response.data as { message?: string }).message || "Ocurrió un error en el servidor"
      : error.message || "Error de red o conexión";

    return Promise.reject(new Error(message));
  }
);
