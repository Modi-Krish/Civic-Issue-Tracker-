'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/auth-context';
import DashboardUI from '@/components/ui/DashboardUI';

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [dashData, setDashData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    let unsubMyIssues: (() => void) | null = null;
    let unsubNearby: (() => void) | null = null;
    let unsubRewards: (() => void) | null = null;

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

        let myIssues: any[] = [];
        let nearbyIssues: any[] = [];
        let totalPoints = 0;

        const updateState = () => {
          const reportedCount = myIssues.length;
          const resolvedCount = myIssues.filter(i => i.status === 'CLOSED').length;
          
          let recent = [...myIssues];
          const activeIssue = recent.find((i: any) => i.status !== "CLOSED" && i.status !== "REJECTED");
          recent = recent.slice(0, 5);

          let nearby = [...nearbyIssues];
          nearby = nearby.slice(0, 3);

          setDashData({
            stats: { reported: reportedCount, resolved: resolvedCount, points: totalPoints },
            nearby: nearby,
            recent: recent,
            active: activeIssue || null,
          });
          setLoading(false);
        };

        // 1. My Issues
        const qMyIssues = query(collection(db, 'issues'), where('reporter_id', '==', user.uid));
        unsubMyIssues = onSnapshot(qMyIssues, (snap) => {
          myIssues = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          myIssues.sort((a, b) => {
            const t = (x: any) => typeof x?.toMillis === 'function' ? x.toMillis() : (x?.seconds ? x.seconds * 1000 : 0);
            return t(b.created_at) - t(a.created_at);
          });
          updateState();
        });

        // 2. Nearby Issues
        const qNearby = query(collection(db, 'issues'), where('reporter_id', '!=', user.uid));
        unsubNearby = onSnapshot(qNearby, (snap) => {
          nearbyIssues = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          nearbyIssues.sort((a, b) => {
            const t = (x: any) => typeof x?.toMillis === 'function' ? x.toMillis() : (x?.seconds ? x.seconds * 1000 : 0);
            return t(b.created_at) - t(a.created_at);
          });
          updateState();
        });

        // 3. Rewards
        const qRewards = query(collection(db, 'rewards'), where('user_id', '==', user.uid));
        unsubRewards = onSnapshot(qRewards, (snap) => {
          totalPoints = 0;
          snap.forEach(doc => { totalPoints += doc.data().points || 0; });
          updateState();
        });

      } catch (error) {
        console.error("Error setting up dashboard listeners:", error);
        setDashData({ stats: { reported: 0, resolved: 0, points: 0 }, nearby: [], recent: [], active: null });
        setLoading(false);
      }
    }

    setupRealtime();

    return () => {
      if (unsubMyIssues) unsubMyIssues();
      if (unsubNearby) unsubNearby();
      if (unsubRewards) unsubRewards();
    };
  }, [user, authLoading, router]);

  if (authLoading || loading || !dashData) {
    return (
      <div style={{ minHeight: '100dvh', background: '#EDEBE4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #DDD9CE', borderTopColor: '#1D9E75', animation: 'spin 0.8s linear infinite' }} />
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
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
