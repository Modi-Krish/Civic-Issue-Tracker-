'use client';

import { useAuth } from '@/lib/supabase/auth-context';
import BottomNav from '@/components/ui/BottomNav';
import PendingApprovalUI from '@/components/ui/PendingApprovalUI';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0d0d0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#FF2E11',
          animation: 'spin 0.8s linear infinite',
        }} />
        
      </div>
    );
  }

  // Intercept unapproved accounts
  if (profile?.account_status === 'PENDING') {
    return <PendingApprovalUI role={profile.role} />;
  }

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1">{children}</main>
      <BottomNav role={profile?.role} />
    </div>
  );
}
