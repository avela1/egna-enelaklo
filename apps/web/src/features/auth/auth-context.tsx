import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { apiRequest, setUnauthorizedHandler } from '@/lib/api';

export interface AuthUser {
  createdAt: string;
  email: string;
  emailVerified: boolean;
  id: string;
  lastLoginAt: string | null;
  locale: string;
  name: string;
  permissions: string[];
  phone: string | null;
  role: string;
  status: string;
}

interface AuthContextValue {
  /** The signed in person, or null. */
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** True when the session ended and the person has to sign in again. */
  sessionExpired: boolean;
  clearSessionExpired: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  signIn: (input: { email: string; password: string }) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  signOutAll: () => Promise<void>;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();
  const hadSession = useRef(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const me = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiRequest<{ user: AuthUser }>('/auth/me', { handleUnauthorized: false }),
    retry: false,
    staleTime: 60_000,
  });

  const user = me.data?.user ?? null;

  useEffect(() => {
    if (user) hadSession.current = true;
  }, [user]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (hadSession.current) {
        hadSession.current = false;
        setSessionExpired(true);
      }
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    });

    return () => setUnauthorizedHandler(null);
  }, [queryClient]);

  const signInMutation = useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      apiRequest<{ user: AuthUser }>('/auth/login', {
        method: 'POST',
        body: input,
        handleUnauthorized: false,
      }),
    onSuccess: async (data) => {
      hadSession.current = true;
      setSessionExpired(false);
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      if (data.user.locale && data.user.locale !== i18n.language) {
        await i18n.changeLanguage(data.user.locale);
      }
    },
  });

  const signOutMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ ok: boolean }>('/auth/logout', { method: 'POST', handleUnauthorized: false }),
    onSuccess: async () => {
      queryClient.clear();
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  const signOutAllMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ ok: boolean }>('/auth/logout-all', {
        method: 'POST',
        handleUnauthorized: false,
      }),
    onSuccess: async () => {
      queryClient.clear();
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  const signIn = useCallback(
    async (input: { email: string; password: string }) => {
      const result = await signInMutation.mutateAsync(input);
      return result.user;
    },
    [signInMutation],
  );

  const signOut = useCallback(async () => {
    await signOutMutation.mutateAsync();
  }, [signOutMutation]);

  const signOutAll = useCallback(async () => {
    await signOutAllMutation.mutateAsync();
  }, [signOutAllMutation]);

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: me.isLoading,
      isAuthenticated: user !== null,
      sessionExpired,
      clearSessionExpired: () => setSessionExpired(false),
      hasPermission: (permission) => (user?.permissions ?? []).includes(permission),
      hasRole: (role) => user?.role === role,
      signIn,
      signOut,
      signOutAll,
      refresh,
    }),
    [user, me.isLoading, sessionExpired, signIn, signOut, signOutAll, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth has to be used inside the AuthProvider');
  }

  return context;
}
