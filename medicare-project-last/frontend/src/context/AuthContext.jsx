import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "../services/api.js";

const AuthContext = createContext(null);

function toSession(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    member_since: user.member_since,
    dark_mode: user.dark_mode,
    medicine_alarm_sound: user.medicine_alarm_sound,
    push_notifications: user.push_notifications,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  // True only while we're checking an existing token on first load, so
  // ProtectedRoute doesn't bounce a logged-in user to /signin before we
  // know whether their token is still valid.
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setInitializing(false);
      return;
    }
    api.auth
      .me()
      .then((me) => setUser(toSession(me)))
      .catch(() => setToken(null))
      .finally(() => setInitializing(false));
  }, []);

  async function signup({ name, email, password }) {
    setLoading(true);
    try {
      const res = await api.auth.register({ name, email, password });
      setToken(res.access_token);
      const session = toSession(res.user);
      setUser(session);
      return session;
    } finally {
      setLoading(false);
    }
  }

  async function signin({ email, password }) {
    setLoading(true);
    try {
      const res = await api.auth.login({ email, password });
      setToken(res.access_token);
      const session = toSession(res.user);
      setUser(session);
      return session;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    api.auth.logout().catch(() => {});
    setToken(null);
    setUser(null);
  }

  function refreshUser(patch) {
    setUser((u) => (u ? { ...u, ...patch } : u));
  }

  return (
    <AuthContext.Provider value={{ user, loading, initializing, signup, signin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
