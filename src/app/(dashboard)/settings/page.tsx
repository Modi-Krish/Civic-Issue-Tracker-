'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import SettingsUI from '@/components/ui/SettingsUI';

const ROLE_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  citizen:            { label: "Citizen",          emoji: "🏙️", color: "#0C447C", bg: "#E6F1FB" },
  department_admin:   { label: "Dept. Admin",      emoji: "🏛️", color: "#27500A", bg: "#EAF3DE" },
  employee:           { label: "Field Employee",   emoji: "🔧", color: "#085041", bg: "#E1F5EE" },
  government_officer: { label: "Gov. Officer",     emoji: "⚖️", color: "#854F0B", bg: "#FAEEDA" },
  company_admin:      { label: "Company Admin",    emoji: "💼", color: "#712B13", bg: "#FAECE7" },
  company_employee:   { label: "Corp. Employee",   emoji: "👷", color: "#085041", bg: "#E1F5EE" },
  super_admin:        { label: "Super Admin",      emoji: "👑", color: "#791F1F", bg: "#FCEBEB" },
};

export default function SettingsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [deptName, setDeptName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    async function fetchDept() {
      if (profile?.department_id) {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        const deptRef = doc(db, 'departments', profile.department_id);
        const deptSnap = await getDoc(deptRef);
        
        if (deptSnap.exists()) {
          setDeptName(deptSnap.data().name);
        } else {
          setDeptName(null);
        }
      }
      setLoading(false);
    }

    fetchDept();
  }, [user, profile, authLoading]);

  if (authLoading || loading || !user) return null;

  const roleConfig = ROLE_CONFIG[profile?.role || 'citizen'] || ROLE_CONFIG.citizen;
  const memberSince = new Date(user.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <SettingsUI
      user={user}
      profile={profile}
      deptName={deptName}
      roleConfig={roleConfig}
      memberSince={memberSince}
    />
  );
}
