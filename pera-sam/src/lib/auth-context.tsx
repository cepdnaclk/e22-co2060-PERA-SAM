import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

export type UserRole = 'normal' | 'company';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatarUrl?: string;
  // Normal user fields
  age?: number;
  address?: string;
  phone?: string;
  // Company user fields
  companyName?: string;
  technicianName?: string;
  serviceCategories?: string[];
  contactNumbers?: string[];
  location?: { lat: number; lng: number };
}

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User> & { location_lat?: number; location_lng?: number; contactNumbers?: string[] }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  isAuthenticated: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  role: UserRole;
  name: string;
  age?: number;
  address?: string;
  phone?: string;
  companyName?: string;
  technicianName?: string;
  serviceCategories?: string[];
  contactNumbers?: string[];
  location_lat?: number;
  location_lng?: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        email: data.email,
        role: data.role as UserRole,
        name: data.name,
        avatarUrl: (data as any).avatar_url ?? undefined,
        age: data.age ?? undefined,
        address: data.address ?? undefined,
        phone: data.phone ?? undefined,
        companyName: data.company_name ?? undefined,
        technicianName: data.technician_name ?? undefined,
        serviceCategories: data.service_categories ?? undefined,
        contactNumbers: data.contact_numbers ?? undefined,
        location: data.location_lat && data.location_lng
          ? { lat: data.location_lat, lng: data.location_lng }
          : undefined,
      };
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setSupabaseUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid potential race conditions with the trigger
          setTimeout(async () => {
            const profile = await fetchUserProfile(session.user.id);
            setUser(profile);
            setIsLoading(false);
          }, 100);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);

      if (session?.user) {
        // Use a Promise.race or a finally block to ensure loading state is cleared
        fetchUserProfile(session.user.id)
          .then((profile) => {
            setUser(profile);
          })
          .catch(err => {
            console.error("AuthContext init error:", err);
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setIsLoading(false);
      throw error;
    }

    if (data.user) {
      const profile = await fetchUserProfile(data.user.id);
      setUser(profile);
    }

    setIsLoading(false);
  };

  const register = async (userData: RegisterData) => {
    setIsLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          name: userData.name,
          role: userData.role,
          age: userData.age,
          address: userData.address,
          phone: userData.phone,
          company_name: userData.companyName,
          technician_name: userData.technicianName,
          service_categories: userData.serviceCategories,
          contact_numbers: userData.contactNumbers,
          location_lat: userData.location_lat,
          location_lng: userData.location_lng,
        },
      },
    });

    if (error) {
      setIsLoading(false);
      throw error;
    }

    // The profile is now automatically created and fully populated by the 
    // database trigger handle_new_user using the metadata provided above.

    if (data.user) {
      const profile = await fetchUserProfile(data.user.id);
      setUser(profile);
    }

    setIsLoading(false);
  };

  const logout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSupabaseUser(null);
    setSession(null);
    setIsLoading(false);
  };

  const resetPassword = async (email: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsLoading(false);
    if (error) throw error;
  };

  const updateProfile = async (updates: Partial<User> & { location_lat?: number; location_lng?: number; contactNumbers?: string[] }) => {
    if (!supabaseUser) return;

    try {
      const dbUpdates: Record<string, any> = {};
      // Normal user fields
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.age !== undefined) dbUpdates.age = updates.age;
      if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
      // Company-specific fields
      if (updates.companyName !== undefined) dbUpdates.company_name = updates.companyName;
      if (updates.technicianName !== undefined) dbUpdates.technician_name = updates.technicianName;
      if (updates.serviceCategories !== undefined) dbUpdates.service_categories = updates.serviceCategories;
      if (updates.contactNumbers !== undefined) dbUpdates.contact_numbers = updates.contactNumbers;
      if ((updates as any).location_lat !== undefined) dbUpdates.location_lat = (updates as any).location_lat;
      if ((updates as any).location_lng !== undefined) dbUpdates.location_lng = (updates as any).location_lng;

      if (Object.keys(dbUpdates).length === 0) return;

      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', supabaseUser.id);

      if (error) throw error;

      // Refresh the local user state
      const freshProfile = await fetchUserProfile(supabaseUser.id);
      setUser(freshProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      supabaseUser,
      session,
      isLoading,
      login,
      register,
      logout,
      updateProfile,
      resetPassword,
      updatePassword,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
