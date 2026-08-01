'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/auth-context';
import AdminReportsUI from '@/components/ui/AdminReportsUI';

export default function AdminReportsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    let unsubscribe: (() => void) | null = null;

    async function loadIssues() {
      if (!user) {
        router.push('/login');
        return;
      }
      if (profile?.role !== 'super_admin') { router.push('/dashboard'); return; }

      try {
        const { collection, getDocs, query, orderBy, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');

        // 1. Departments (one-time fetch)
        const qDept = query(collection(db, 'departments'), orderBy('name'));
        const deptSnap = await getDocs(qDept);
        const departments = deptSnap.docs.map(d => ({ id: d.id, name: d.data().name }));

        // 2. Issues (real-time)
        const qIssues = query(collection(db, 'issues'), orderBy('created_at', 'desc'));
        unsubscribe = onSnapshot(qIssues, (snapshot) => {
          const issues = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setData({ issues, departments });
          setLoading(false);
        }, (err) => {
          console.error("Error listening to issues:", err);
          setLoading(false);
        });

      } catch (error) {
        console.error("Error loading issues:", error);
        setLoading(false);
      }
    }

    loadIssues();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, profile, authLoading, router]);

  if (authLoading || loading || !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0d0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#FF2E11', animation: 'spin 0.8s linear infinite' }} />
        
      </div>
    );
  }

  return (
    <AdminReportsUI
      initialIssues={data.issues}
      departments={data.departments}
    />
  );
}
