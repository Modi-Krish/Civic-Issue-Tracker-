'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Shield, Save, CheckCircle, XCircle, Clock } from 'lucide-react';
import { changeUserRole, reviewUser } from "@/lib/client-actions/admin";

const ROLES = [
  { id: 'citizen', label: 'Citizen' },
  { id: 'department_admin', label: 'Dept. Admin' },
  { id: 'employee', label: 'Field Employee' },
  { id: 'government_officer', label: 'Gov. Officer' },
  { id: 'company_admin', label: 'Company Admin' },
  { id: 'company_employee', label: 'Corp. Employee' },
  { id: 'super_admin', label: 'Super Admin' }
];

export default function AdminUsersUI({ initialUsers }: { initialUsers: any[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleRoleChange(userId: string, newRole: string) {
    setLoadingId(userId);
    const res = await changeUserRole(userId, newRole);
    if (res?.success) {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole, account_status: 'APPROVED' } : u));
    } else {
      alert(res?.error || "Failed to update role");
    }
    setLoadingId(null);
  }

  async function handleReview(userId: string, action: 'APPROVE'|'REJECT') {
    setLoadingId(userId);
    const res = await reviewUser(userId, action);
    if (res?.success) {
      setUsers(users.map(u => u.id === userId ? { ...u, account_status: 'APPROVED', role: action === 'REJECT' ? 'citizen' : u.role } : u));
    } else {
      alert(res?.error || "Failed to review user");
    }
    setLoadingId(null);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0f", fontFamily: "'Inter',-apple-system,sans-serif", color: "#ffffff" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px 100px" }}>
        
        <header style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <button onClick={() => router.push("/admin")} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 10, color: "white", cursor: "pointer" }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 4px" }}>User Management</h1>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: 0 }}>Super Admin Access Control</p>
          </div>
        </header>

        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1.5px solid rgba(255,255,255,0.05)", overflow: "hidden" }}>
          {users.map((u, i) => (
            <div key={u.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px",
              borderBottom: i < users.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: u.account_status === 'PENDING' ? "rgba(251,191,36,0.1)" : "rgba(139, 92, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: u.account_status === 'PENDING' ? "#fbbf24" : "#a78bfa" }}>
                  {u.account_status === 'PENDING' ? <Clock size={18} /> : <Users size={18} />}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                    {u.full_name} 
                    {u.account_status === 'PENDING' && <span style={{ marginLeft: 8, fontSize: 10, background: "#fbbf2433", color: "#fbbf24", padding: "2px 6px", borderRadius: 4, textTransform: "uppercase", fontWeight: 800 }}>Pending Approval</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>ID: {u.id.substring(0, 8)}...</div>
                </div>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {u.account_status === 'PENDING' ? (
                  <>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginRight: 8 }}>Requested: <strong>{ROLES.find(r => r.id === u.role)?.label}</strong></div>
                    <button disabled={loadingId === u.id} onClick={() => handleReview(u.id, 'APPROVE')} style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700 }}>
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button disabled={loadingId === u.id} onClick={() => handleReview(u.id, 'REJECT')} style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700 }}>
                      <XCircle size={14} /> Reject
                    </button>
                  </>
                ) : (
                  <>
                    <select 
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      disabled={loadingId === u.id}
                      style={{
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                        color: "white", padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                        cursor: "pointer", outline: "none", opacity: loadingId === u.id ? 0.5 : 1
                      }}
                    >
                      {ROLES.map(r => (
                        <option key={r.id} value={r.id} style={{ background: "#1a1a1a" }}>{r.label}</option>
                      ))}
                    </select>
                    {loadingId === u.id && <Save size={16} color="#10b981" />}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
