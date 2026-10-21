import { createContext, useContext, useState, type ReactNode } from "react";
import { setToken, clearToken } from "../api/client";

interface User {
  id: string;
  role: "EXECUTIVE" | "MANAGER" | "OPERATOR";
  fullName?: string;
  email?: string;
  operatorName?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(
    JSON.parse(localStorage.getItem("mes_user") || "null")
  );

  const login = (token: string, userData: User) => {
    setToken(token);
    localStorage.setItem("mes_user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    clearToken();
    localStorage.removeItem("mes_user");
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}