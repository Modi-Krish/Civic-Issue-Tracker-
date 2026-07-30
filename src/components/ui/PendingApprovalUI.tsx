'use client';

import { ShieldAlert, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/client-actions/auth';

export default function PendingApprovalUI({ role }: { role: string }) {
  const router = useRouter();
  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", color: "#ffffff", padding: 24 }}>
      <div style={{ maxWidth: 440, width: "100%", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1.5px solid rgba(255,255,255,0.05)", borderRadius: 24, padding: "40px 32px", position: "relative", overflow: "hidden" }}>
        
        <div style={{ position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)", width: 200, height: 200, background: "radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)", borderRadius: "50%" }} />

        <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(251, 191, 36, 0.15)", color: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <ShieldAlert size={32} />
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 12, letterSpacing: "-0.03em" }}>Account Pending Approval</h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
          Your request for the <strong>{role.replace('_', ' ').toUpperCase()}</strong> role is currently under review by an administrator. You will gain access to your dashboard once approved.
        </p>

        <button onClick={async () => {
          const result = await signOut();
          if (result?.redirectTo) router.push(result.redirectTo);
        }} style={{
          padding: "16px 32px", borderRadius: 16, border: "1.5px solid rgba(239, 68, 68, 0.3)",
          background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", fontSize: 14, fontWeight: 800,
          cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 10
        }}>
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
