'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

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
      if (error) console.error("fetchProfile error:", error);
      console.log("Fetched profile data:", data);
      setProfile(data);
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
    // Rely entirely on onAuthStateChange for initial session to prevent Web Lock race conditions

    // Listen for auth changes
    console.log("Setting up onAuthStateChange");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("onAuthStateChange event:", event, session?.user?.id);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
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

    // Fallback: force loading false after 3s if it hangs
    const fallbackTimeout = setTimeout(() => {
      console.warn("AuthContext fallback timeout triggered. Forcing loading = false.");
      setLoading(false);
    }, 3000);

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
