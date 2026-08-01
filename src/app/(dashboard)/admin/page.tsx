'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
        router.push('/login');
        return;
      }
      if (profile?.role !== 'super_admin') { router.push('/dashboard'); return; }

      try {
        const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');

        // 1. Departments
        const qDept = query(collection(db, 'departments'), orderBy('name'));
        const deptSnap = await getDocs(qDept);
        const deptList = deptSnap.docs.map(d => ({ id: d.id, name: d.data().name }));

        // 2. All Issues
        const qIssues = query(collection(db, 'issues'));
        const issuesSnap = await getDocs(qIssues);
        const issueList = issuesSnap.docs.map(d => ({ id: d.id, status: d.data().status, department_id: d.data().department_id }));

        // 3. Recent Issues
        const qRecent = query(collection(db, 'issues'), orderBy('created_at', 'desc'), limit(5));
        const recentSnap = await getDocs(qRecent);
        const recentIssues = recentSnap.docs.map(d => ({ id: d.id, ...d.data() }));

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
          recent: recentIssues,
        });
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
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
