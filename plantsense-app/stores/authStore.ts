import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { setSecureItem, deleteSecureItem } from '../services/secureStorage';
import { STORAGE_KEYS } from '../constants';
import type { User, LoginRequest, RegisterRequest } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;
}

interface AuthContextType extends AuthState {
  login: (req: LoginRequest) => Promise<void>;
  register: (req: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<Pick<User, 'nickname' | 'avatar'>>) => Promise<void>;
}

const initialState: AuthState = { user: null, token: null, isLoading: true, isLoggedIn: false };

export const AuthContext = createContext<AuthContextType>({
  ...initialState,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

function supabaseUserToUser(sbUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): User {
  return {
    id: sbUser.id,
    email: sbUser.email ?? '',
    nickname: sbUser.user_metadata?.nickname as string | undefined,
    avatar: sbUser.user_metadata?.avatar as string | undefined,
  };
}

export function useAuthProvider(): AuthContextType {
  const [state, setState] = useState<AuthState>(initialState);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSecureItem(STORAGE_KEYS.AUTH_TOKEN, session.access_token).catch(() => {});
        setState({
          user: supabaseUserToUser(session.user),
          token: session.access_token,
          isLoading: false,
          isLoggedIn: true,
        });
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSecureItem(STORAGE_KEYS.AUTH_TOKEN, session.access_token).catch(() => {});
        setState({
          user: supabaseUserToUser(session.user),
          token: session.access_token,
          isLoading: false,
          isLoggedIn: true,
        });
      } else {
        setState({ user: null, token: null, isLoading: false, isLoggedIn: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (req: LoginRequest) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: req.email,
      password: req.password,
    });
    if (error) throw new Error(error.message);
    if (data.session) {
      await setSecureItem(STORAGE_KEYS.AUTH_TOKEN, data.session.access_token);
    }
  }, []);

  const register = useCallback(async (req: RegisterRequest) => {
    const { error } = await supabase.auth.signUp({
      email: req.email,
      password: req.password,
      options: {
        data: { nickname: req.nickname ?? '' },
      },
    });
    if (error) throw new Error(error.message);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    await deleteSecureItem(STORAGE_KEYS.AUTH_TOKEN);
  }, []);

  const updateUser = useCallback(async (updates: Partial<Pick<User, 'nickname' | 'avatar'>>) => {
    const { data, error } = await supabase.auth.updateUser({ data: updates });
    if (error) throw new Error(error.message);
    if (data.user) {
      setState(prev => ({ ...prev, user: supabaseUserToUser(data.user) }));
    }
  }, []);

  return { ...state, login, register, logout, updateUser };
}
