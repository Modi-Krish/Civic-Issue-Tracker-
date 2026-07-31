'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import AdminUsersUI from '@/components/ui/AdminUsersUI';

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    async function loadUsers() {
      if (!user) {
        const { data: { session } } = await createClient().auth.getSession();
        if (!session) { router.push('/login'); return; }
        return; // wait for context to sync
      }
      if (profile?.role !== 'super_admin') { router.push('/dashboard'); return; }

      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role, account_status, created_at")
        .order("created_at", { ascending: false });

      setProfiles(data || []);
      setLoading(false);
    }

    loadUsers();
  }, [user, profile, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0d0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#FF2E11', animation: 'spin 0.8s linear infinite' }} />
        
      </div>
    );
  }

  return <AdminUsersUI initialUsers={profiles} />;
}
