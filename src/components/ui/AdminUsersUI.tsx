import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Shield, Save, CheckCircle, XCircle, Clock, ChevronDown } from 'lucide-react';
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

function CustomSelect({ value, options, onChange, disabled, placeholder }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o: any) => o.value === value);

  return (
    <div ref={ref} style={{ position: 'relative', width: 140 }}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          color: value ? "white" : "rgba(255,255,255,0.5)", padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600,
          cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'border-color 0.2s, background 0.2s'
        }}
        onMouseEnter={e => { if(!disabled) (e.currentTarget.style.background = "rgba(255,255,255,0.08)") }}
        onMouseLeave={e => { if(!disabled) (e.currentTarget.style.background = "rgba(255,255,255,0.05)") }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={14} style={{ opacity: 0.5, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
          boxShadow: "0 10px 25px rgba(0,0,0,0.5)", zIndex: 10, overflow: 'hidden',
          maxHeight: 200, overflowY: 'auto'
        }}>
          {options.map((o: any) => (
            <div 
              key={o.value}
              onClick={() => { onChange(o.value); setIsOpen(false); }}
              style={{
                padding: "8px 12px", fontSize: 13, fontWeight: 600,
                color: value === o.value ? "white" : "rgba(255,255,255,0.7)",
                background: value === o.value ? "rgba(255,255,255,0.05)" : "transparent",
                cursor: 'pointer', transition: 'background 0.2s'
              }}
              onMouseEnter={e => { if(value !== o.value) (e.currentTarget.style.background = "rgba(255,255,255,0.03)") }}
              onMouseLeave={e => { if(value !== o.value) (e.currentTarget.style.background = "transparent") }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminUsersUI({ initialUsers, departments = [] }: { initialUsers: any[], departments?: any[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleRoleChange(userId: string, newRole: string, newDeptId?: string) {
    setLoadingId(userId);
    const res = await changeUserRole(userId, newRole, newDeptId);
    if (res?.success) {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole, department_id: newDeptId !== undefined ? newDeptId : u.department_id, account_status: 'APPROVED' } : u));
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

  const needsDepartment = (role: string) => role === 'department_admin' || role === 'employee';

  const roleOptions = ROLES.map(r => ({ value: r.id, label: r.label }));
  const deptOptions = departments.map(d => ({ value: d.id, label: d.name }));

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0f", fontFamily: "'Inter',-apple-system,sans-serif", color: "#ffffff" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px 100px" }}>
        
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
                    <CustomSelect 
                      value={u.role}
                      options={roleOptions}
                      onChange={(val: string) => handleRoleChange(u.id, val, u.department_id)}
                      disabled={loadingId === u.id}
                      placeholder="Select Role"
                    />

                    {needsDepartment(u.role) && (
                      <CustomSelect 
                        value={u.department_id || ''}
                        options={deptOptions}
                        onChange={(val: string) => handleRoleChange(u.id, u.role, val)}
                        disabled={loadingId === u.id}
                        placeholder="Select Dept"
                      />
                    )}

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
