import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Shield, Save, CheckCircle, XCircle, Clock, ChevronDown } from 'lucide-react';
import { changeUserRole, reviewUser } from "@/lib/client-actions/admin";

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
          background: T.raised, border: `1px solid ${T.border}`,
          color: value ? T.text1 : T.text3, padding: "8px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700,
          cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'border-color 0.2s, background 0.2s', boxShadow: SH.insetSoft
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={14} style={{ color: T.text3, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8,
          background: T.raised, border: `1px solid ${T.border}`, borderRadius: 14,
          boxShadow: SH.raised, zIndex: 10, overflow: 'hidden',
          maxHeight: 200, overflowY: 'auto'
        }}>
          {options.map((o: any) => (
            <div 
              key={o.value}
              onClick={() => { onChange(o.value); setIsOpen(false); }}
              style={{
                padding: "10px 12px", fontSize: 12, fontWeight: 700,
                color: value === o.value ? T.accentDark : T.text2,
                background: value === o.value ? T.accentTint : "transparent",
                cursor: 'pointer', transition: 'background 0.2s'
              }}
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
    <div style={{ minHeight: "100dvh", background: T.base, fontFamily: "'Inter',-apple-system,sans-serif", color: T.text1 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 100px" }}>
        
        <header style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <button onClick={() => router.push("/admin")} style={{ background: T.raised, border: `1px solid ${T.border}`, borderRadius: 14, padding: 12, color: T.text1, cursor: "pointer", boxShadow: SH.raisedSm }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 4px", color: T.text1, letterSpacing: "-0.04em" }}>User Management</h1>
            <p style={{ color: T.text3, fontSize: 11, margin: 0, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>Super Admin Access Control</p>
          </div>
        </header>

        <div style={{ background: T.base, borderRadius: 24, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: SH.insetSoft }}>
          {users.map((u, i) => (
            <div key={u.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px",
              borderBottom: i < users.length - 1 ? `1px solid ${T.border}` : "none",
              flexWrap: "wrap", gap: 16
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: u.account_status === 'PENDING' ? "#FAEEDA" : T.raised, display: "flex", alignItems: "center", justifyContent: "center", color: u.account_status === 'PENDING' ? "#854F0B" : T.accentDark, border: `1px solid ${T.border}`, boxShadow: SH.raisedSm }}>
                  {u.account_status === 'PENDING' ? <Clock size={20} /> : <Users size={20} />}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 4, color: T.text1 }}>
                    {u.full_name} 
                    {u.account_status === 'PENDING' && <span style={{ marginLeft: 10, fontSize: 9, background: "#FAEEDA", color: "#854F0B", padding: "4px 8px", borderRadius: 99, textTransform: "uppercase", fontWeight: 900, boxShadow: SH.raisedSm }}>Pending Approval</span>}
                  </div>
                  <div style={{ fontSize: 11, color: T.text3, fontWeight: 700, fontFamily: "monospace" }}>ID: {u.id.substring(0, 8)}...</div>
                </div>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                {u.account_status === 'PENDING' ? (
                  <>
                    <div style={{ fontSize: 11, color: T.text3, marginRight: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Requested: <strong style={{ color: T.text1 }}>{ROLES.find(r => r.id === u.role)?.label}</strong></div>
                    <button disabled={loadingId === u.id} onClick={() => handleReview(u.id, 'APPROVE')} style={{ padding: "8px 16px", borderRadius: 12, background: "#EAF3DE", color: "#27500A", border: "1px solid #27500A30", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 900, boxShadow: SH.raisedSm }}>
                      <CheckCircle size={16} /> Approve
                    </button>
                    <button disabled={loadingId === u.id} onClick={() => handleReview(u.id, 'REJECT')} style={{ padding: "8px 16px", borderRadius: 12, background: "#FCEBEB", color: "#791F1F", border: "1px solid #791F1F30", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 900, boxShadow: SH.raisedSm }}>
                      <XCircle size={16} /> Reject
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

                    {loadingId === u.id && <Save size={18} color={T.accentDark} />}
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
