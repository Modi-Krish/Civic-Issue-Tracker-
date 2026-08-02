'use client';

import { useState } from 'react';
import { reviewUser } from '@/lib/client-actions/admin';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

const T = {
  base:       '#EDEBE4',
  raised:     '#F5F3EC',
  border:     '#DDD9CE',
  text1:      '#2C2C2A',
  text2:      '#5F5E5A',
  text3:      '#888780',
  accent:     '#1D9E75',
  accentDark: '#167A5B',
  accentTint: '#E1F5EE',
  shL: 'rgba(255,255,255,0.75)',
  shD: 'rgba(0,0,0,0.09)',
} as const;

const SH = {
  raised:   `8px 8px 16px ${T.shD}, -8px -8px 16px ${T.shL}`,
  raisedSm: `4px 4px 8px ${T.shD}, -4px -4px 8px ${T.shL}`,
  insetSoft:`inset 3px 3px 7px ${T.shD}, inset -3px -3px 7px ${T.shL}`,
};

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
        <div style={{ width: 4, height: 16, background: "#854F0B", borderRadius: 2 }} />
        <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0, color: T.text1 }}>Pending Approvals</h2>
        <span style={{ background: "#FAEEDA", color: "#854F0B", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 900, boxShadow: SH.insetSoft }}>{users.length}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {users.map(u => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: T.raised, border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: SH.raisedSm, flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "#FAEEDA", border: "1px solid #854F0B30", display: "flex", alignItems: "center", justifyContent: "center", color: "#854F0B", boxShadow: SH.insetSoft }}>
                <Clock size={20} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4, color: T.text1 }}>{u.full_name}</div>
                <div style={{ fontSize: 11, color: T.text3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Requested Role: Field Employee</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button disabled={loadingId === u.id} onClick={() => handleReview(u.id, 'APPROVE')} style={{ padding: "10px 16px", borderRadius: 12, background: "#EAF3DE", color: "#27500A", border: "1px solid #27500A30", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", boxShadow: SH.raisedSm }}>
                <CheckCircle size={14} /> Approve
              </button>
              <button disabled={loadingId === u.id} onClick={() => handleReview(u.id, 'REJECT')} style={{ padding: "10px 16px", borderRadius: 12, background: "#FCEBEB", color: "#791F1F", border: "1px solid #791F1F30", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", boxShadow: SH.raisedSm }}>
                <XCircle size={14} /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
