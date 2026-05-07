import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export interface AdminRole {
  role: "head_admin" | "coach_admin" | "accountant_admin";
  discipline_id: number | null;
  discipline_name: string | null;
  team_id: number | null;
  team_name: string | null;
}

export interface AuthUser {
  access: string;
  refresh: string;
  username: string;
  is_staff: boolean;
  is_superuser: boolean;
  admin_roles: AdminRole[];
  [key: string]: any;
}

type AuthContextType = {
  user: AuthUser | null;
  login: (tokens: any) => void;
  logout: () => void;
  isSuperAdmin: () => boolean;
  isAnyAdmin: () => boolean;
  isHeadAdmin: (disciplineId?: number) => boolean;
  isCoachAdmin: (disciplineId?: number) => boolean;
  isAccountantAdmin: () => boolean;
  getAdminDisciplines: (minRole?: "head_admin" | "coach_admin") => AdminRole[];
  hasAdminAccess: (
    disciplineId: number,
    minRole?: "head_admin" | "coach_admin",
  ) => boolean;
  /**
   * Returns team IDs the current user can manage as coach_admin for a discipline.
   * Returns null if user has unrestricted access (superuser, head_admin, or coach_admin with no team constraint).
   * Returns [] if no matching roles.
   */
  getCoachTeamIds: (disciplineId?: number) => number[] | null;
};
const AuthContext = createContext<AuthContextType | null>(null);

function decodeJWT(token: string) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem("auth");
    return saved ? JSON.parse(saved) : null;
  });

  const login = (tokens: any) => {
    let userInfo: any = {};
    if (tokens?.access) {
      userInfo = decodeJWT(tokens.access);
    }
    const userObj: AuthUser = {
      ...tokens,
      ...userInfo,
      admin_roles: userInfo.admin_roles ?? [],
    };
    setUser(userObj);
    localStorage.setItem("auth", JSON.stringify(userObj));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("auth");
  };

  const isSuperAdmin = () => !!user?.is_superuser;

  const isAccountantAdmin = () => {
    if (!user) return false;
    if (user.is_superuser) return true;
    return (user.admin_roles ?? []).some((r) => r.role === "accountant_admin");
  };

  const isAnyAdmin = () =>
    !!user &&
    (!!user.is_superuser ||
      !!user.is_staff ||
      (user.admin_roles?.length ?? 0) > 0);

  const isHeadAdmin = (disciplineId?: number) => {
    if (!user) return false;
    if (user.is_superuser) return true;
    const roles = user.admin_roles ?? [];
    if (disciplineId !== undefined) {
      return roles.some(
        (r) => r.role === "head_admin" && r.discipline_id === disciplineId,
      );
    }
    return roles.some((r) => r.role === "head_admin");
  };

  const isCoachAdmin = (disciplineId?: number) => {
    if (!user) return false;
    if (user.is_superuser) return true;
    const roles = user.admin_roles ?? [];
    if (disciplineId !== undefined) {
      return roles.some((r) => r.discipline_id === disciplineId);
    }
    return roles.length > 0;
  };

  const getAdminDisciplines = (
    minRole: "head_admin" | "coach_admin" = "coach_admin",
  ): AdminRole[] => {
    if (!user) return [];
    const roles = user.admin_roles ?? [];
    if (minRole === "head_admin") {
      return roles.filter((r) => r.role === "head_admin");
    }
    return roles;
  };

  const hasAdminAccess = (
    disciplineId: number,
    minRole: "head_admin" | "coach_admin" = "coach_admin",
  ) => {
    if (!user) return false;
    if (user.is_superuser) return true;
    const roles = user.admin_roles ?? [];
    if (minRole === "head_admin") {
      return roles.some(
        (r) => r.role === "head_admin" && r.discipline_id === disciplineId,
      );
    }
    return roles.some((r) => r.discipline_id === disciplineId);
  };

  // Returns team IDs the current user can manage as coach_admin for a discipline.
  // Returns null if user has unrestricted access (superuser, head_admin, or coach_admin with no team constraint).
  // Returns [] if no matching roles.
  const getCoachTeamIds = (disciplineId?: number): number[] | null => {
    if (!user) return [];
    if (user.is_superuser) return null;
    const roles = user.admin_roles ?? [];

    const relevant =
      disciplineId !== undefined
        ? roles.filter((r) => r.discipline_id === disciplineId)
        : roles;

    // head_admin → unrestricted
    if (relevant.some((r) => r.role === "head_admin")) return null;

    const coachRoles = relevant.filter((r) => r.role === "coach_admin");

    // coach_admin with no team constraint → unrestricted
    if (coachRoles.some((r) => r.team_id === null)) return null;

    // Return specific team IDs
    return coachRoles.map((r) => r.team_id!).filter((id) => id !== null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isSuperAdmin,
        isAnyAdmin,
        isHeadAdmin,
        isCoachAdmin,
        isAccountantAdmin,
        getAdminDisciplines,
        hasAdminAccess,
        getCoachTeamIds,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
