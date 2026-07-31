'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import MyReportsUI from '@/components/ui/MyReportsUI';

export default function MyReportsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    async function fetchReports() {
      if (!user) {
        const { data: { session } } = await createClient().auth.getSession();
        if (!session) { router.push('/login'); return; }
        return; // wait for context to sync
      }

      const supabase = createClient();
      const { data } = await supabase
        .from("issues")
        .select("*")
        .eq("reporter_id", user!.id)
        .order("created_at", { ascending: false });

      setIssues(data || []);
      setLoading(false);
    }

    fetchReports();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0d0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#FF2E11', animation: 'spin 0.8s linear infinite' }} />
        
      </div>
    );
  }

  return <MyReportsUI initialIssues={issues} />;
}
