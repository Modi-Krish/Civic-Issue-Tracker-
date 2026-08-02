'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/auth-context';
import AdminUsersUI from '@/components/ui/AdminUsersUI';

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    async function loadData() {
      if (!user) {
        router.push('/login');
        return;
      }
      if (profile?.role !== 'super_admin') { router.push('/dashboard'); return; }

      try {
        const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');

        const qProfiles = query(collection(db, 'profiles'), orderBy('created_at', 'desc'));
        const snapProfiles = await getDocs(qProfiles);
        
        const data = snapProfiles.docs.map(doc => ({
          id: doc.id,
          full_name: doc.data().full_name,
          role: doc.data().role,
          department_id: doc.data().department_id,
          account_status: doc.data().account_status,
          created_at: doc.data().created_at
        }));

        setProfiles(data);

        // Fetch departments
        const snapDepts = await getDocs(collection(db, 'departments'));
        const deptsData = snapDepts.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          slug: doc.data().slug
        }));
        setDepartments(deptsData);

      } catch (error) {
        console.error("Error loading admin data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, profile, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100dvh', background: '#EDEBE4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #DDD9CE', borderTopColor: '#1D9E75', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return <AdminUsersUI initialUsers={profiles} departments={departments} />;
}
