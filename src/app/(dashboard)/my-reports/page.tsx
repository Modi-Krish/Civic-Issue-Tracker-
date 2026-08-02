'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/auth-context';
import MyReportsUI from '@/components/ui/MyReportsUI';

export default function MyReportsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    let unsubscribe: (() => void) | null = null;

    async function setupRealtime() {
      if (!user) {
        router.push('/login');
        return;
      }

      if (profile && profile.role !== 'citizen') {
        const roleMap: Record<string, string> = {
          super_admin: '/admin',
          government_officer: '/government',
          department_admin: '/department',
          company_admin: '/company-admin',
          company_employee: '/company-employee',
          employee: '/tasks'
        };
        router.push(roleMap[profile.role] || '/login');
        return;
      }

      try {
        const { collection, query, where, onSnapshot, orderBy } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');

        const q = query(
          collection(db, 'issues'), 
          where('reporter_id', '==', user.uid),
          orderBy('created_at', 'desc')
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setIssues(data);
          setLoading(false);
        }, (error) => {
          console.error("Error listening to reports:", error);
          setLoading(false);
        });

      } catch (error) {
        console.error("Error setting up reports listener:", error);
        setIssues([]);
        setLoading(false);
      }
    }

    setupRealtime();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100dvh', background: '#EDEBE4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #DDD9CE', borderTopColor: '#1D9E75', animation: 'spin 0.8s linear infinite' }} />
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
      </div>
    );
  }

  return <MyReportsUI initialIssues={issues} />;
}
