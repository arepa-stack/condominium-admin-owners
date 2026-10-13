import { apiClient } from "@/lib/api/client";
import { APP_API_PREFIX } from "@/lib/utils/constants";
import type { AuthResponse, LoginCredentials, User } from "@/types/models";

function normalizeUser(user: any): User {
  if (!user) return user;
  const rawUnits = user.units || user.profile_units || [];
  const normalizedUnits = rawUnits.map((u: any) => ({
    unit_id: u.unit_id || u.unitId || u.id || "",
    building_id: u.building_id || u.buildingId || "",
    building_role: u.building_role || u.buildingRole || u.role || "",
    is_primary: Boolean(u.is_primary ?? u.isPrimary ?? false),
    unit_name: u.unit_name || u.unitName || u.name || (u.unit ? u.unit.name : undefined),
    building_name: u.building_name || u.buildingName || (u.building ? u.building.name : undefined),
  }));

  return {
    ...user,
    units: normalizedUnits,
  };
}

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

    let userToStore = normalizeUser(data.user);

    // Try to get fresh profile data if possible
    try {
      const freshUser = await this.getCurrentUser();
      if (freshUser) {
        userToStore = normalizeUser(freshUser);
        data.user = userToStore;
      }
    } catch {
      data.user = userToStore;
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("user_data", JSON.stringify(data.user));
    }

    return data;
  },

  async getCurrentUser(): Promise<User> {
    try {
      const { data } = await apiClient.get<any>(`${APP_API_PREFIX}/users/me`);
      return normalizeUser(data);
    } catch (error) {
      // Fallback: direct users/me
      const { data } = await apiClient.get<any>("/users/me");
      return normalizeUser(data);
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
