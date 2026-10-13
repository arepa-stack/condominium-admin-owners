"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authService } from "@/lib/services/auth.service";
import type { User, UserUnit } from "@/types/models";

interface AuthContextType {
  user: User | null;
  activeUnit: UserUnit | null;
  setActiveUnit: (unit: UserUnit) => void;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [activeUnit, setActiveUnitState] = useState<UserUnit | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const determineActiveUnit = useCallback((currentUser: User): UserUnit | null => {
    if (!currentUser.units || currentUser.units.length === 0) return null;
    const savedUnitId = typeof window !== "undefined" ? localStorage.getItem("selected_unit_id") : null;
    if (savedUnitId) {
      const found = currentUser.units.find((u) => u.unit_id === savedUnitId);
      if (found) return found;
    }
    const primary = currentUser.units.find((u) => u.is_primary);
    return primary || currentUser.units[0];
  }, []);

  const setActiveUnit = (unit: UserUnit) => {
    setActiveUnitState(unit);
    if (typeof window !== "undefined") {
      localStorage.setItem("selected_unit_id", unit.unit_id);
    }
  };

  const refreshUser = useCallback(async () => {
    if (!authService.isAuthenticated()) {
      setUser(null);
      setActiveUnitState(null);
      setIsLoading(false);
      return;
    }

    try {
      const freshUser = await authService.getCurrentUser();
      setUser(freshUser);
      const unit = determineActiveUnit(freshUser);
      setActiveUnitState(unit);
    } catch (err) {
      // If fails, try stored
      const stored = authService.getStoredUser();
      if (stored) {
        setUser(stored);
        setActiveUnitState(determineActiveUnit(stored));
      } else {
        authService.clearSession();
      }
    } finally {
      setIsLoading(false);
    }
  }, [determineActiveUnit]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login({ email, password: pass });
      setUser(response.user);
      const unit = determineActiveUnit(response.user);
      setActiveUnitState(unit);
      router.push("/invoices");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setActiveUnitState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeUnit,
        setActiveUnit,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
