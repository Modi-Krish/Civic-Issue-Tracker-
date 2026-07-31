'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import AdminDashboardUI from '@/components/ui/AdminDashboardUI';

export default function AdminPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    async function fetchData() {
      if (!user) {
        const { data: { session } } = await createClient().auth.getSession();
        if (!session) { router.push('/login'); return; }
        return; // wait for context to sync
      }
      if (profile?.role !== 'super_admin') { router.push('/dashboard'); return; }

      const supabase = createClient();
      const [
        { data: departments },
        { data: allIssues },
        { data: recentIssues }
      ] = await Promise.all([
        supabase.from("departments").select("id, name").order("name"),
        supabase.from("issues").select("id, status, department_id"),
        supabase.from("issues").select("*").order("created_at", { ascending: false }).limit(5),
      ]);

      const deptList = departments || [];
      const issueList = allIssues || [];
      const total = issueList.length;
      const resolved = issueList.filter((i: any) => i.status === "CLOSED" || i.status === "APPROVED").length;
      const open = issueList.filter((i: any) => i.status !== "CLOSED" && i.status !== "REJECTED" && i.status !== "APPROVED").length;

      const deptStats = deptList.map((dept: any) => {
        const deptIssues = issueList.filter((i: any) => i.department_id === dept.id);
        const deptResolved = deptIssues.filter((i: any) => i.status === "CLOSED" || i.status === "APPROVED").length;
        const deptOpen = deptIssues.filter((i: any) => i.status !== "CLOSED" && i.status !== "REJECTED" && i.status !== "APPROVED").length;
        return { id: dept.id, name: dept.name, total: deptIssues.length, resolved: deptResolved, open: deptOpen };
      });

      setData({
        stats: { total, resolved, open, departments: deptList.length },
        deptStats,
        recent: recentIssues || [],
      });
      setLoading(false);
    }

    fetchData();
  }, [user, profile, authLoading, router]);

  if (authLoading || loading || !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0d0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#FF2E11', animation: 'spin 0.8s linear infinite' }} />
        
      </div>
    );
  }

  return (
    <AdminDashboardUI
      user={user!}
      profile={profile}
      initialStats={data.stats}
      initialDeptStats={data.deptStats}
      initialRecent={data.recent}
    />
  );
}
