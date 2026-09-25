import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateProfile: (fullName: string, contactPhone: string) => Promise<void>;
  setDemoSession: (email: string, name: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  updateProfile: async () => { throw new Error('Authentication is unavailable.'); },
  setDemoSession: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get the current session on mount
    supabase.auth
      .getSession()
      .then(({ data: { session: currentSession } }) => {
        setSession(currentSession);
      })
      .catch(() => {
        setSession(null);
      })
      .finally(() => {
        setLoading(false);
      });

    // Listen for auth state changes
    let unsubscribe = () => {};
    try {
      const { data } = supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          setSession(newSession);
          setLoading(false);
        }
      );
      if (data?.subscription) {
        unsubscribe = () => data.subscription.unsubscribe();
      }
    } catch (e) {
      console.warn('Auth state listener error:', e);
      setLoading(false);
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore if offline
    }
    setSession(null);
  };

  const updateProfile = async (fullName: string, contactPhone: string) => {
    if (!session?.user) throw new Error('Please sign in again.');
    const userId = session.user.id;
    const metadata = { full_name: fullName, name: fullName, contact_phone: contactPhone };
    if (userId === 'demo-user-123') {
      setSession((current) => current?.user.id === userId ? {
        ...current,
        user: { ...current.user, user_metadata: { ...current.user.user_metadata, ...metadata } },
      } : current);
      return;
    }
    const { data, error } = await supabase.auth.updateUser({ data: metadata });
    if (error) throw error;
    if (!data.user) throw new Error('Profile could not be saved.');
    setSession((current) => current?.user.id === userId ? { ...current, user: data.user } : current);
  };

  const setDemoSession = (email: string, name: string) => {
    const mockUser: any = {
      id: 'demo-user-123',
      email: email || 'user@perasam.org',
      user_metadata: {
        full_name: name || 'Demo Engineer',
        name: name || 'Demo Engineer',
      },
      created_at: new Date().toISOString(),
    };
    const mockSession: any = {
      access_token: 'demo-access-token',
      user: mockUser,
    };
    setSession(mockSession);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signOut,
        updateProfile,
        setDemoSession,
      }}
    >
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
