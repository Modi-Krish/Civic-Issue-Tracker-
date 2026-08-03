'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/auth-context';
import ReportsHubUI from '@/components/ui/ReportsHubUI';

export default function ReportsHubPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div style={{ minHeight: '100dvh', background: '#EDEBE4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #DDD9CE', borderTopColor: '#1D9E75', animation: 'spin 0.8s linear infinite' }} />
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  // Strictly for citizens right now, or maybe other roles can use it too. 
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
    return null;
  }

  return <ReportsHubUI user={user} profile={profile} />;
}
