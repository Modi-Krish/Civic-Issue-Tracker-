'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import Link from 'next/link';
import { Users, Clock, CheckCircle, AlertTriangle, Building2, ChevronRight } from 'lucide-react';
import type { Issue } from '@/lib/types/database';
import DepartmentActions from '@/components/department/DepartmentActions';

export default function DepartmentPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [dept, setDept] = useState<any>(null);
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile?.department_id) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      const fallbackTimeout = setTimeout(() => {
        setErrorToast("Loading is taking too long. Please try refreshing.");
        setLoading(false);
      }, 5000);

      try {
        const supabase = createClient();
        const [
          { data: deptData, error: deptError },
          { data: issuesData, error: issuesError },
          { data: empData, error: empError }
        ] = await Promise.all([
          supabase.from('departments').select('name').eq('id', profile!.department_id!).single(),
          supabase.from('issues').select('*').eq('department_id', profile!.department_id!).order('created_at', { ascending: false }),
          supabase.from('profiles').select('id, full_name').eq('department_id', profile!.department_id!).eq('role', 'employee'),
        ]);

        if (deptError || issuesError || empError) {
          setErrorToast("Failed to load department data.");
        }

        setDept(deptData);
        setAllIssues((issuesData || []) as Issue[]);
        setEmployees(empData || []);
      } catch (err) {
        setErrorToast("An unexpected error occurred while loading data.");
      } finally {
        clearTimeout(fallbackTimeout);
        setLoading(false);
      }
    }

    fetchData();
  }, [user, profile, authLoading]);

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d0d0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#FF2E11', animation: 'spin 0.8s linear infinite' }} />
        
      </div>
    );
  }

  if (!profile?.department_id) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d0d0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏛️</div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>NO DEPARTMENT ASSIGNED</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 8 }}>Contact system administrator to link your account.</p>
        </div>
      </div>
    );
  }

  const pendingAssignment = allIssues.filter(i => i.status === 'REPORTED' || i.status === 'DEPARTMENT_ASSIGNED');
  const pendingApproval = allIssues.filter(i => i.status === 'SUBMITTED_FOR_APPROVAL');
  const inProgress = allIssues.filter(i => i.status === 'EMPLOYEE_ASSIGNED' || i.status === 'IN_PROGRESS');

  const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
    REPORTED:               { label: "Reported",         color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)" },
    DEPARTMENT_ASSIGNED:    { label: "Dept. Assigned",   color: "#0ea5e9", bg: "rgba(14, 165, 233, 0.15)" },
    EMPLOYEE_ASSIGNED:      { label: "Staff Assigned",   color: "#a78bfa", bg: "rgba(167, 139, 250, 0.15)" },
    IN_PROGRESS:            { label: "Working",          color: "#fbbf24", bg: "rgba(251, 191, 36, 0.15)" },
    SUBMITTED_FOR_APPROVAL: { label: "Needs Approval",   color: "#a855f7", bg: "rgba(168, 85, 247, 0.18)" },
    APPROVED:               { label: "Approved",         color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" },
    REJECTED:               { label: "Rejected",         color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" },
    CLOSED:                 { label: "Resolved",         color: "rgba(255, 255, 255, 0.5)", bg: "rgba(255, 255, 255, 0.05)" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0f", fontFamily: "'Inter', -apple-system, sans-serif", color: "#ffffff", paddingBottom: 60 }}>
       {/* ambient */}
       <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -100, left: "10%", width: 500, height: 350, background: "radial-gradient(ellipse,rgba(167,139,250,0.05) 0%,transparent 70%)", borderRadius: "50%" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto", padding: "0 16px" }}>

        {errorToast && (
          <div style={{ padding: "14px", borderRadius: 14, background: "rgba(239, 68, 68, 0.1)", border: "1.5px solid rgba(239, 68, 68, 0.3)", fontSize: 13, color: "#ef4444", fontWeight: 700, marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>⚠️ {errorToast}</span>
            <button onClick={() => setErrorToast(null)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        )}

        {/* Header */}
        <div style={{ padding: "32px 0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "4px 12px", borderRadius: 99, background: "rgba(167, 139, 250, 0.1)", border: "1px solid rgba(167, 139, 250, 0.2)", width: "fit-content" }}>
            <Building2 size={12} color="#a78bfa" />
            <span style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {dept?.name} UNIT
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>Operational Queue</h1>
        </div>

        {/* Quick Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 28 }}>
          {[
            { icon: AlertTriangle, label: "To Assign",    value: pendingAssignment.length, color: "#fbbf24", bg: "rgba(251, 191, 36, 0.08)" },
            { icon: Clock,          label: "In Progress",  value: inProgress.length,        color: "#a78bfa", bg: "rgba(167, 139, 250, 0.08)" },
            { icon: CheckCircle,    label: "To Approve",   value: pendingApproval.length,   color: "#3b82f6", bg: "rgba(59, 130, 246, 0.08)" },
            { icon: Users,          label: "Force Size",   value: employees.length,         color: "#10b981", bg: "rgba(16, 185, 129, 0.08)" },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} style={{ borderRadius: 20, padding: "20px 16px", background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.06)`, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={18} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "white", lineHeight: 1, letterSpacing: "-0.04em" }}>{value}</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Queue Management */}
        <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
           <h2 style={{ fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>ACTIVE INCIDENTS</h2>
           <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>{allIssues.length} TOTAL</span>
        </div>

        {allIssues.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", borderRadius: 24, border: "1.5px dashed rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
            <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>✔️</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "white", marginBottom: 8 }}>Clear Queue</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", maxWidth: 280, margin: "0 auto" }}>Great job! No pending reports require departmental action at this time.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {allIssues.map((issue: Issue) => {
              const st = STATUS_STYLE[issue.status] || STATUS_STYLE.REPORTED;
              return (
                <div key={issue.id} style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", overflow: "hidden", position: "relative" }}>
                   {/* status accent bar */}
                  <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: st.color }} />
                  
                  <div style={{ padding: "18px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link href={`/issue?id=${issue.id}`} style={{ fontSize: 15, fontWeight: 800, color: "white", textDecoration: "none", letterSpacing: "-0.01em", display: "block", marginBottom: 5 }}>
                          {issue.title}
                        </Link>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>ID #{issue.id.slice(0, 8).toUpperCase()}</span>
                          <span style={{ width: 1, height: 10, background: "rgba(255,255,255,0.1)" }} />
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{issue.issue_type}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "5px 12px", borderRadius: 10, background: st.bg, color: st.color, border: `1px solid ${st.color}25`, whiteSpace: "nowrap" }}>
                        {st.label?.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "12px", border: "1.5px solid rgba(255,255,255,0.05)" }}>
                       <DepartmentActions issue={issue} employees={employees} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
