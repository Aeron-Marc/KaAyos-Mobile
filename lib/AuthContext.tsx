import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import { router } from 'expo-router';
import * as SecureStore from '@/lib/secureStorage';
import type { User } from '@/lib/api';
import { setToken, setOnUnauthorized } from '@/lib/api';

const AUTH_TOKEN_KEY = 'kaayos_auth_token';
const AUTH_USER_KEY = 'kaayos_auth_user';

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const jsonStr = typeof atob === 'function' ? atob(base64) : null;
    if (!jsonStr) return false;
    const payload = JSON.parse(jsonStr);
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (user: User, token: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  signIn: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          SecureStore.getItemAsync(AUTH_TOKEN_KEY),
          SecureStore.getItemAsync(AUTH_USER_KEY),
        ]);
        if (storedToken && storedUser && !isTokenExpired(storedToken)) {
          setToken(storedToken);
          setTokenState(storedToken);
          setUser(JSON.parse(storedUser));
        } else if (storedToken || storedUser) {
          await Promise.all([
            SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
            SecureStore.deleteItemAsync(AUTH_USER_KEY),
          ]);
          setToken(null);
          setTokenState(null);
          setUser(null);
        }
      } catch {
        // ignore storage errors
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback((userData: User, newToken: string) => {
    setToken(newToken);
    setTokenState(newToken);
    setUser(userData);
    SecureStore.setItemAsync(AUTH_TOKEN_KEY, newToken);
    SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(userData));
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setUser(null);
    SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    SecureStore.deleteItemAsync(AUTH_USER_KEY);
    try {
      router.replace('/auth/login');
    } catch {
      // ignore
    }
  }, []);

  // Register auto-logout on 401
  useEffect(() => {
    setOnUnauthorized(signOut);
  }, [signOut]);

  const value = useMemo(() => ({
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    signIn,
    signOut,
  }), [user, token, isLoading, signIn, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}