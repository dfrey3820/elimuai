"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { hasAuthToken, clearTokens, setTokens } from "@/utils/auth";
import { apiGet } from "@/utils/api";

const AppContext = createContext(null);

const COUNTRY_NAME = { KE: "Kenya", TZ: "Tanzania", UG: "Uganda" };

export function AppProvider({ children }) {
  const [lang, setLang] = useState("en");
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [country, setCountry] = useState("Kenya");
  const [level, setLevel] = useState("Grade 9 (JSS)");
  const [plan, setPlan] = useState("free");
  const [isOffline, setIsOffline] = useState(false);
  const [billingEnabled, setBillingEnabled] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Load user on mount
  useEffect(() => {
    setHydrated(true);
    if (!hasAuthToken()) return;
    apiGet("/api/users/profile")
      .then((d) => {
        if (d?.user) setUser(d.user);
      })
      .catch(() => {});
    apiGet("/api/payments/subscription-info")
      .then((d) => {
        if (typeof d?.billingEnabled !== "undefined")
          setBillingEnabled(d.billingEnabled);
      })
      .catch(() => {});
  }, []);

  // Sync user data to state
  useEffect(() => {
    if (!user) return;
    if (user.plan) setPlan(user.plan);
    if (user.language) setLang(user.language);
    if (user.country && COUNTRY_NAME[user.country])
      setCountry(COUNTRY_NAME[user.country]);
    if (user.grade_level) setLevel(user.grade_level);
    if (user.role && !role) {
      const r = user.role;
      setRole(r === "super_admin" ? "admin" : r);
    }
  }, [user]);

  const handleAuthSuccess = (u, data) => {
    setTokens(data);
    if (u) setUser(u);
    if (u?.role) {
      const r = u.role;
      setRole(r === "super_admin" ? "admin" : r);
    }
  };

  const handleLogout = () => {
    clearTokens();
    setUser(null);
    setRole(null);
  };

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        user,
        setUser,
        role,
        setRole,
        country,
        setCountry,
        level,
        setLevel,
        plan,
        setPlan,
        isOffline,
        setIsOffline,
        billingEnabled,
        handleAuthSuccess,
        handleLogout,
        hydrated,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
