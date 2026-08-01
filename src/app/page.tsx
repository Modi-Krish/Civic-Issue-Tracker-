'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import LandingUI from '@/components/ui/LandingUI';

export default function LandingPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ resolved: 0, citizens: 0, successRate: 94 });

  useEffect(() => {
    async function fetchStats() {
      try {
        const { collection, query, where, getCountFromServer } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        const issuesCol = collection(db, 'issues');
        const profilesCol = collection(db, 'profiles');

        const resolvedQ = query(issuesCol, where('status', '==', 'CLOSED'));
        const citizenQ = query(profilesCol, where('role', '==', 'citizen'));
        
        const [
          resolvedSnap,
          citizenSnap,
          totalSnap
        ] = await Promise.all([
          getCountFromServer(resolvedQ),
          getCountFromServer(citizenQ),
          getCountFromServer(issuesCol)
        ]);

        const resolvedCount = resolvedSnap.data().count;
        const citizenCount = citizenSnap.data().count;
        const totalCount = totalSnap.data().count;

        const successRate = totalCount && totalCount > 0
          ? Math.round(((resolvedCount || 0) / (totalCount || 1)) * 100)
          : 94;

        setStats({
          resolved: resolvedCount || 0,
          citizens: citizenCount || 0,
          successRate,
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
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
