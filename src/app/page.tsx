'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import LandingUI from '@/components/ui/LandingUI';

export default function LandingPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ resolved: 0, citizens: 0, successRate: 94 });

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();
      const [
        { count: resolvedCount },
        { count: citizenCount },
        { count: totalCount }
      ] = await Promise.all([
        supabase.from("issues").select("*", { count: "exact", head: true }).eq("status", "CLOSED"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "citizen"),
        supabase.from("issues").select("*", { count: "exact", head: true })
      ]);

      const successRate = totalCount && totalCount > 0
        ? Math.round(((resolvedCount || 0) / (totalCount || 1)) * 100)
        : 94;

      setStats({
        resolved: resolvedCount || 0,
        citizens: citizenCount || 0,
        successRate,
      });
    }
    fetchStats();
  }, []);

  return (
    <LandingUI
      user={user}
      stats={stats}
    />
  );
}
