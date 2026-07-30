'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import DashboardUI from '@/components/ui/DashboardUI';

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [dashData, setDashData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    async function fetchDashboard() {
      const supabase = createClient();
      const [
        { count: reportedCount },
        { count: resolvedCount },
        { data: rewards },
        { data: recentIssues },
        { data: nearbyIssues }
      ] = await Promise.all([
        supabase.from("issues").select("*", { count: "exact", head: true }).eq("reporter_id", user!.id),
        supabase.from("issues").select("*", { count: "exact", head: true }).eq("reporter_id", user!.id).eq("status", "CLOSED"),
        supabase.from("rewards").select("points").eq("user_id", user!.id),
        supabase.from("issues").select("*").eq("reporter_id", user!.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("issues").select("*").neq("reporter_id", user!.id).order("created_at", { ascending: false }).limit(3),
      ]);

      const totalPoints = (rewards || []).reduce((acc: number, curr: any) => acc + (curr.points || 0), 0);
      const activeIssue = (recentIssues || []).find((i: any) => i.status !== "CLOSED" && i.status !== "REJECTED");

      setDashData({
        stats: { reported: reportedCount || 0, resolved: resolvedCount || 0, points: totalPoints || 0 },
        nearby: nearbyIssues || [],
        recent: recentIssues || [],
        active: activeIssue || null,
      });
      setLoading(false);
    }

    fetchDashboard();
  }, [user, authLoading, router]);

  if (authLoading || loading || !dashData) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0d0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#FF2E11', animation: 'spin 0.8s linear infinite' }} />
        
      </div>
    );
  }

  return (
    <DashboardUI
      user={user!}
      profile={profile}
      initialStats={dashData.stats}
      initialNearby={dashData.nearby}
      initialRecent={dashData.recent}
      initialActive={dashData.active}
    />
  );
}
