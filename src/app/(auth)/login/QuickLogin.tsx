'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { quickLogin } from '@/lib/client-actions/auth';
import { Zap, LogIn, ChevronRight } from 'lucide-react';

const ROLES = [
  { id: 'citizen', label: 'Citizen' },
  { id: 'government_officer', label: 'Gov Officer' },
  { id: 'department_admin', label: 'Dept Admin' },
  { id: 'company_admin', label: 'Company Admin' },
  { id: 'company_employee', label: 'Company Employee' },
  { id: 'super_admin', label: 'Super Admin' },
];

export function QuickLogin() {
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const router = useRouter();

  const handleQuickLogin = async (role: string) => {
    setLoadingRole(role);
    const res = await quickLogin(role);
    if (res?.error) alert(res.error);
    else if (res?.redirectTo) router.push(res.redirectTo);
    setLoadingRole(null);
  };

  return (
    <div style={{ marginTop: 24 }}>
      <p style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
        Or Quick Login (Testing)
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {ROLES.map((r) => (
          <button
            key={r.id}
            onClick={() => handleQuickLogin(r.id)}
            disabled={loadingRole !== null}
            style={{
              padding: "10px",
              borderRadius: 12,
              border: "1.5px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "white",
              fontSize: 12,
              fontWeight: 600,
              cursor: loadingRole !== null ? "not-allowed" : "pointer",
              transition: "0.2s",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              opacity: loadingRole && loadingRole !== r.id ? 0.5 : 1,
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
          >
            {loadingRole === r.id ? "Loading..." : r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
