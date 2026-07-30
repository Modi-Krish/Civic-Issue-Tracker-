'use client';

import { useState } from 'react';
import { reviewUser } from '@/lib/client-actions/admin';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

export default function PendingStaffUI({ pendingUsers }: { pendingUsers: any[] }) {
  const [users, setUsers] = useState(pendingUsers);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (users.length === 0) return null;

  async function handleReview(userId: string, action: 'APPROVE' | 'REJECT') {
    setLoadingId(userId);
    const res = await reviewUser(userId, action);
    if (res?.success) {
      setUsers(users.filter(u => u.id !== userId));
    } else {
      alert(res?.error || "Failed to process request");
    }
    setLoadingId(null);
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div style={{ width: 4, height: 16, background: "#fbbf24", borderRadius: 2 }} />
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Pending Approvals</h2>
        <span style={{ background: "#fbbf2422", color: "#fbbf24", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 800 }}>{users.length}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {users.map(u => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "rgba(251,191,36,0.03)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(251,191,36,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fbbf24" }}>
                <Clock size={16} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{u.full_name}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Requested Role: Field Employee</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button disabled={loadingId === u.id} onClick={() => handleReview(u.id, 'APPROVE')} style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700 }}>
                <CheckCircle size={14} /> Approve
              </button>
              <button disabled={loadingId === u.id} onClick={() => handleReview(u.id, 'REJECT')} style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700 }}>
                <XCircle size={14} /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
