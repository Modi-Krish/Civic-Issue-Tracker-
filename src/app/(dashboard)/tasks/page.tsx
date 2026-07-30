'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import Link from 'next/link';
import { Briefcase, MapPin, CheckCircle, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import type { Issue } from '@/lib/types/database';
import EmployeeActions from '@/components/employee/EmployeeActions';

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  REPORTED:               { label: "Reported",         color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
  IN_PROGRESS:            { label: "In Progress",      color: "#fbbf24", bg: "rgba(251, 191, 36, 0.1)" },
  APPROVED:               { label: "Approved",         color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
  CLOSED:                 { label: "Resolved",         color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
  EMPLOYEE_ASSIGNED:      { label: "Assigned To You",  color: "#a78bfa", bg: "rgba(167, 139, 250, 0.1)" },
  SUBMITTED_FOR_APPROVAL: { label: "Pending Review",   color: "#a855f7", bg: "rgba(168, 85, 247, 0.1)" },
  DEPARTMENT_ASSIGNED:    { label: "Dept Assigned",    color: "#0ea5e9", bg: "rgba(14, 165, 233, 0.1)" },
  REJECTED:               { label: "Needs Revisiting", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" },
};

export default function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const [allTasks, setAllTasks] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    async function fetchTasks() {
      const supabase = createClient();
      const { data: issues } = await supabase
        .from('issues').select('*')
        .eq('assigned_employee_id', user!.id)
        .order('created_at', { ascending: false });

      setAllTasks((issues || []) as Issue[]);
      setLoading(false);
    }
    fetchTasks();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d0d0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#FF2E11', animation: 'spin 0.8s linear infinite' }} />
        
      </div>
    );
  }

  if (!user) return null;

  const activeTasks = allTasks.filter(i => i.status !== 'CLOSED' && i.status !== 'APPROVED');
  const completedTasks = allTasks.filter(i => i.status === 'CLOSED' || i.status === 'APPROVED');

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0f", fontFamily: "'Inter', -apple-system, sans-serif", color: "#ffffff", paddingBottom: 100 }}>
       {/* ambient */}
       <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -80, left: "15%", width: 400, height: 300, background: "radial-gradient(ellipse,rgba(167,139,250,0.06) 0%,transparent 70%)", borderRadius: "50%" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto", padding: "0 16px" }}>

        {/* Header */}
        <div style={{ padding: "32px 0 24px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 6px" }}>My Assignments</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0, fontWeight: 600 }}>
             Operational force status: {activeTasks.length > 0 ? 'ACTIVE' : 'READY'}
          </p>
        </div>

        {/* Status Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Active Jobs", value: activeTasks.length, color: "#fbbf24", bg: "rgba(251, 191, 36, 0.08)", icon: AlertTriangle },
            { label: "Resolutions", value: completedTasks.length, color: "#10b981", bg: "rgba(16, 185, 129, 0.08)", icon: CheckCircle },
          ].map(s => (
            <div key={s.label} style={{ borderRadius: 20, padding: "20px 18px", background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.06)`, display: "flex", alignItems: "center", gap: 14 }}>
               <div style={{ width: 42, height: 42, borderRadius: 12, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <s.icon size={20} color={s.color} />
               </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "white", lineHeight: 1, letterSpacing: "-0.04em" }}>{s.value}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {allTasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", borderRadius: 24, border: "1.5px dashed rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
               <Briefcase size={32} color="#a78bfa" />
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "white", marginBottom: 8 }}>Queue is empty</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", maxWidth: 280, margin: "0 auto" }}>New tasks assigned by your department admin will appear here instantly.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
             <h2 style={{ fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Task Registry</h2>
            {allTasks.map((issue: Issue) => {
              const st = STATUS_STYLE[issue.status] || STATUS_STYLE.REPORTED;
              return (
                <div key={issue.id} style={{ borderRadius: 20, border: `1px solid rgba(255,255,255,0.08)`, background: "rgba(255,255,255,0.03)", overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: st.color }} />
                  <div style={{ padding: "20px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link href={`/issue?id=${issue.id}`} style={{ fontSize: 15, fontWeight: 800, color: "white", textDecoration: "none", letterSpacing: "-0.01em", display: "block", marginBottom: 6 }}>
                          {issue.title}
                        </Link>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
                          <MapPin size={12} color="#a78bfa" />
                          {issue.location_label || "Local Assignment"}
                        </span>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "5px 12px", borderRadius: 10, background: st.bg, color: st.color, border: `1px solid ${st.color}25`, whiteSpace: "nowrap", flexShrink: 0 }}>
                        {st.label?.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "14px", border: "1.5px solid rgba(255,255,255,0.05)" }}>
                       <EmployeeActions issue={issue} />
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
