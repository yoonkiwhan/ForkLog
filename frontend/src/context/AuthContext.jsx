import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { api, getToken } from "../api";

const AuthContext = createContext(null);

const TOKEN_KEY = "forklog_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const setToken = useCallback((token) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, []);

  const loadUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.auth.me();
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setToken]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(
    async (username, password) => {
      const data = await api.auth.login(username, password);
      setToken(data.token);
      await loadUser();
      return data;
    },
    [setToken, loadUser]
  );

  const register = useCallback(
    async (username, password) => {
      const data = await api.auth.register(username, password);
      setToken(data.token);
      setUser(data.user);
      return data;
    },
    [setToken]
  );

  const loginWithToken = useCallback(
    (token) => {
      setToken(token);
      loadUser();
    },
    [setToken, loadUser]
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, [setToken]);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    loginWithToken,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
