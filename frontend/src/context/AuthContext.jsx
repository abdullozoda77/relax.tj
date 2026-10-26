import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setLogoutHandler, tokens } from "../api.js";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!tokens.access);

  const loadProfile = useCallback(async () => {
    const profile = await api("/auth/profile/");
    setUser(profile);
    return profile;
  }, []);

  // If we have a token from the last visit, load the profile once on start.
  useEffect(() => {
    setLogoutHandler(() => setUser(null));
    if (tokens.access) {
      loadProfile()
        .catch(() => tokens.clear())
        .finally(() => setReady(true));
    }
  }, [loadProfile]);

  async function login(username, password) {
    tokens.save(await api("/auth/login/", { method: "POST", body: { username, password } }));
    return loadProfile();
  }

  // Creates the account; it can be used after the email is confirmed (the letter has the link).
  // Returns { detail, email }.
  function register(data) {
    return api("/auth/register/", { method: "POST", body: data });
  }

  // Logs in with tokens from the email confirmation page.
  function loginWithTokens(newTokens) {
    tokens.save(newTokens);
    return loadProfile();
  }

  // Continue with Google: the server checks Google's ID token and logs in (or creates) the account.
  async function loginWithGoogle(credential) {
    const data = await api("/auth/google/", { method: "POST", body: { credential } });
    tokens.save(data.tokens);
    await loadProfile();
    return data;
  }

  async function logout() {
    try {
      if (tokens.refresh) await api("/auth/logout/", { method: "POST", body: { refresh: tokens.refresh } });
    } catch {
      // The token may already be expired; we log out locally anyway.
    }
    tokens.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, register, loginWithTokens, loginWithGoogle, logout, reloadUser: loadProfile, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
