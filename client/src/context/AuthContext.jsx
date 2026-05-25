import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { loginUser, registerUser, setAPIAuthToken } from "../services/api";
import { setWorkspaceSocketToken } from "../services/socket";

const AUTH_STORAGE_KEY = "synapse.auth.session";

const AuthContext = createContext(null);

function getEmptySession() {
  return {
    token: "",
    user: null,
  };
}

function readStoredSession() {
  if (typeof window === "undefined") {
    return getEmptySession();
  }

  try {
    const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!rawValue) {
      return getEmptySession();
    }

    const parsedValue = JSON.parse(rawValue);

    if (typeof parsedValue?.token !== "string" || !parsedValue?.user) {
      return getEmptySession();
    }

    return {
      token: parsedValue.token,
      user: parsedValue.user,
    };
  } catch (_error) {
    return getEmptySession();
  }
}

function persistSession(session) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session.token || !session.user) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readStoredSession());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setAPIAuthToken(session.token);
    setWorkspaceSocketToken(session.token);
    persistSession(session);
    setIsReady(true);
  }, [session]);

  useEffect(() => {
    function handleUnauthorized() {
      setSession(getEmptySession());
    }

    window.addEventListener("synapse:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("synapse:unauthorized", handleUnauthorized);
    };
  }, []);

  async function login(credentials) {
    const response = await loginUser(credentials);

    setAPIAuthToken(response.token);
    setWorkspaceSocketToken(response.token);

    setSession({
      token: response.token,
      user: response.user,
    });

    return response;
  }

  async function signup(payload) {
    const response = await registerUser(payload);

    setAPIAuthToken(response.token);
    setWorkspaceSocketToken(response.token);

    setSession({
      token: response.token,
      user: response.user,
    });

    return response;
  }

  function logout() {
    setAPIAuthToken("");
    setWorkspaceSocketToken("");
    setSession(getEmptySession());
  }

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(session.token && session.user),
      isReady,
      login,
      logout,
      signup,
      token: session.token,
      user: session.user,
    }),
    [isReady, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }

  return context;
}