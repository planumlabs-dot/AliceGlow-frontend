import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { DEMO_MODE } from "@/lib/demo-data";

interface AuthUser {
  role: "ADMIN" | "USER";
  email: string;
  name?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function parseJwt(token: string): Record<string, any> | null {
  try {
    const base64 = token.split(".")[1];
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function toStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return [value];
  return [];
}

function isAdminFromPayload(payload: Record<string, any>): boolean {
  const directRole = String(payload.role || payload.perfil || payload.profile || "");
  if (directRole === "ADMIN" || directRole === "ROLE_ADMIN") return true;

  const roles = [
    ...toStringArray(payload.perfils),
    ...toStringArray(payload.perfis),
    ...toStringArray(payload.roles),
    ...toStringArray(payload.authorities),
  ].map((r) => r.toUpperCase());

  return roles.includes("ADMIN") || roles.includes("ROLE_ADMIN");
}

const demoUser: AuthUser = {
  role: "ADMIN",
  email: "alice@aliceglow.com",
  name: "Alice Glow",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    DEMO_MODE ? "demo" : localStorage.getItem("aliceglow_token")
  );
  const [user, setUser] = useState<AuthUser | null>(DEMO_MODE ? demoUser : null);

  const logout = () => {
    localStorage.removeItem("aliceglow_token");
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    if (DEMO_MODE) {
      setUser(demoUser);
      return;
    }
    if (token) {
      const payload = parseJwt(token);
      if (payload) {
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          logout();
          return;
        }
        setUser({
          role: isAdminFromPayload(payload) ? "ADMIN" : "USER",
          email: payload.email || payload.sub || "",
          name: payload.name || "",
        });
      } else {
        logout();
      }
    } else {
      setUser(null);
    }
  }, [token]);

  const login = (newToken: string) => {
    localStorage.setItem("aliceglow_token", newToken);
    setToken(newToken);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAdmin: user?.role === "ADMIN",
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
