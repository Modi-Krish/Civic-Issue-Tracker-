'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import AdminReportsUI from '@/components/ui/AdminReportsUI';

export default function AdminReportsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    async function loadIssues() {
      if (!user) {
        const { data: { session } } = await createClient().auth.getSession();
        if (!session) { router.push('/login'); return; }
        return; // wait for context to sync
      }
      if (profile?.role !== 'super_admin') { router.push('/dashboard'); return; }

      const supabase = createClient();
      const [
        { data: issues },
        { data: departments }
      ] = await Promise.all([
        supabase.from("issues").select("*").order("created_at", { ascending: false }),
        supabase.from("departments").select("id, name").order("name"),
      ]);

      setData({ issues: issues || [], departments: departments || [] });
      setLoading(false);
    }

    loadIssues();
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
