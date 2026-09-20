import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  login as loginApi,
  logout as logoutApi,
  getCurrentUser,
} from '../api';
import { supabase } from '../api/supabaseClient';
import { User } from '../types';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        if (DEMO_MODE) {
          const demoUser = await getCurrentUser();

          if (mounted) {
            setUser(demoUser);
          }

          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          const userData = await getCurrentUser();

          if (mounted) {
            setUser(userData);
          }
        } else if (mounted) {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);

        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    if (DEMO_MODE) {
      return () => {
        mounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const userData = await getCurrentUser();

        if (mounted) {
          setUser(userData);
        }
      } else if (event === 'SIGNED_OUT' && mounted) {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await loginApi(email, password);

      if (response.success && response.user) {
        setUser(response.user);
      } else {
        throw new Error('Login failed');
      }
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes('Invalid login credentials')
      ) {
        throw new Error('Invalid credentials');
      }

      throw new Error(
        error instanceof Error
          ? error.message
          : 'Login failed. Please try again.'
      );
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};