'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
interface User {
  id: string;
  email?: string;
  created_at: string;
  user_metadata?: {
    role?: string;
    full_name?: string;
    department_id?: string | null;
  };
}

interface Profile {
  id: string;
  full_name: string;
  role: string;
  department_id: string | null;
  account_status: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = React.useMemo(() => createClient(), []);

  async function fetchProfile(userId: string) {
    console.log("Fetching profile for user:", userId);
    let isResolved = false;
    setTimeout(() => {
      if (!isResolved) console.warn("fetchProfile is STILL hanging after 5 seconds!");
      else console.log("Main thread is alive and fetchProfile resolved.");
    }, 5000);
    
    try {
      const promise = supabase
        .from('profiles')
        .select('id, full_name, role, department_id, account_status')
        .eq('id', userId)
        .single();
        
      const { data, error } = await promise;
      isResolved = true;
      if (error) {
        if (error.code === 'PGRST116') {
          console.warn("Profile not found. The user account might have been deleted. Signing out.");
          await supabase.auth.signOut();
          setUser(null);
        } else {
          console.error(`fetchProfile error: ${error.message} (Code: ${error.code}, Details: ${error.details})`);
          // Force signout if it's an unauthorized or permission error just in case
          if (error.code === '42501' || error.message?.includes('JWT')) {
            await supabase.auth.signOut();
            setUser(null);
          }
        }
      } else {
        console.log("Fetched profile data:", data);
      }
      setProfile(data || null);
    } catch (err) {
      isResolved = true;
      console.error("fetchProfile exception:", err);
    }
  }

  async function refreshProfile() {
    if (user) {
      await fetchProfile(user.id);
    }
  }

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        setLoading(true);
        fetchProfile(currentUser.id).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    const { data: { subscription } }: any = supabase.auth.onAuthStateChange(
      (event: any, session: any) => {
        console.log("onAuthStateChange event:", event, session?.user?.id);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          if (event === 'SIGNED_IN') setLoading(true);
          fetchProfile(currentUser.id)
            .catch((err) => {
              console.error("fetchProfile in onAuthStateChange failed", err);
            })
            .finally(() => {
              console.log("onAuthStateChange setting loading false");
              setLoading(false);
            });
        } else {
          setProfile(null);
          console.log("onAuthStateChange setting loading false");
          setLoading(false);
        }
      }
    );

    const fallbackTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
