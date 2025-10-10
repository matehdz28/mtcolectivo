import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearToken, getToken as getStored, saveToken } from "../services/auth";

type AuthCtx = {
  token: string | null;
  setToken: (t: string | null) => void;
  logout: () => void;
  isAuth: boolean;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getStored());

  useEffect(() => {
    if (token) saveToken(token);
    else clearToken();
  }, [token]);

  const logout = () => {
    clearToken();
    setTokenState(null);
  };

  const value = useMemo<AuthCtx>(
    () => ({
      token,
      setToken: setTokenState,
      logout,
      isAuth: !!token,
    }),
    [token]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}