import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getAnonIdentity } from "@/lib/anon";

/**
 * Bağımsız sürümde hesap sistemi yoktur: herkes bu tarayıcıya özel anonim
 * kimlikle yazar. `user` nesnesi bu kimliği taşır (kasa, oylama ve silme
 * yetkisi bu kimliğe bağlanır).
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const identity = getAnonIdentity();
    setUser({ id: identity.id, full_name: identity.name, email: null, role: "user" });
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: false,
      isLoadingAuth: false,
      authError: null,
      refresh: async () => user,
      logout: () => {},
      navigateToLogin: () => {
        window.location.assign("/login");
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}