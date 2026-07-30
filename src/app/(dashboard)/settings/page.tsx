'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import SettingsUI from '@/components/ui/SettingsUI';

const ROLE_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  citizen:            { label: "Citizen",          emoji: "🏙️", color: "#60a5fa", bg: "#1e3a5f" },
  department_admin:   { label: "Dept. Admin",      emoji: "🏛️", color: "#FF2E11", bg: "#3a1a1a" },
  employee:           { label: "Field Employee",   emoji: "🔧", color: "#10b981", bg: "#1a3a2a" },
  government_officer: { label: "Gov. Officer",     emoji: "⚖️", color: "#A79277", bg: "#2d241d" },
  company_admin:      { label: "Company Admin",    emoji: "💼", color: "#fbbf24", bg: "#332700" },
  company_employee:   { label: "Corp. Employee",   emoji: "👷", color: "#10b981", bg: "#00331a" },
  super_admin:        { label: "Super Admin",      emoji: "👑", color: "#FF2E11", bg: "#3a0000" },
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
        const supabase = createClient();
        const { data: dept } = await supabase.from('departments').select('name').eq('id', profile.department_id).single();
        setDeptName(dept?.name ?? null);
      }
      setLoading(false);
    }

    fetchDept();
  }, [user, profile, authLoading]);

  if (authLoading || loading || !user) return null;

  const roleConfig = ROLE_CONFIG[profile?.role || 'citizen'] || ROLE_CONFIG.citizen;
  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

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
