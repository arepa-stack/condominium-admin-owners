import { apiClient } from "@/lib/api/client";
import { APP_API_PREFIX } from "@/lib/utils/constants";
import type { AuthResponse, LoginCredentials, User } from "@/types/models";

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>("/auth/login", credentials);

    const accessToken = data.token?.access_token || (data as any).access_token;
    const refreshToken = data.token?.refresh_token || (data as any).refresh_token;

    if (!accessToken) {
      throw new Error("No se recibió el token de autenticación del servidor.");
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", accessToken);
      if (refreshToken) {
        localStorage.setItem("refresh_token", refreshToken);
      }
    }

    // Verify account status
    if (data.user?.status === "pending") {
      this.clearSession();
      throw new Error("Tu cuenta está pendiente de aprobación por la administración.");
    }

    if (data.user?.status === "rejected") {
      this.clearSession();
      throw new Error("Tu registro ha sido rechazado.");
    }

    if (data.user?.status === "inactive") {
      this.clearSession();
      throw new Error("Tu cuenta se encuentra inactiva. Contacta a la administración.");
    }

    // Try to get fresh profile data if possible
    try {
      const freshUser = await this.getCurrentUser();
      if (freshUser) {
        data.user = freshUser;
      }
    } catch {
      // Fallback to data.user from login
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("user_data", JSON.stringify(data.user));
    }

    return data;
  },

  async getCurrentUser(): Promise<User> {
    try {
      const { data } = await apiClient.get<User>(`${APP_API_PREFIX}/users/me`);
      return data;
    } catch (error) {
      // Fallback: direct users/me
      const { data } = await apiClient.get<User>("/users/me");
      return data;
    }
  },

  clearSession() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user_data");
      localStorage.removeItem("selected_unit_id");
    }
  },

  logout() {
    this.clearSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  },

  getAccessToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access_token");
    }
    return null;
  },

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  },

  getStoredUser(): User | null {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("user_data");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  },
};
