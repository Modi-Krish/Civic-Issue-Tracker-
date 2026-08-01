"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, CheckCircle2, BarChart2, ArrowRight, TrendingUp, Building2, RefreshCw } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/lib/supabase/client';

import PredictiveAlertsTab from '@/components/admin/PredictiveAlertsTab';

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  REPORTED:              { label: "Reported",         bg: "#1e3a5f", color: "#60a5fa", dot: "#3b82f6" },
  DEPARTMENT_ASSIGNED:   { label: "Dept. Assigned",   bg: "#1a2e3a", color: "#67e8f9", dot: "#06b6d4" },
  EMPLOYEE_ASSIGNED:     { label: "Emp. Assigned",    bg: "#1a2e3a", color: "#67e8f9", dot: "#06b6d4" },
  IN_PROGRESS:           { label: "In Progress",      bg: "#1a3a2a", color: "#34d399", dot: "#10b981" },
  SUBMITTED_FOR_APPROVAL:{ label: "Pending Approval", bg: "#3a2a0a", color: "#fbbf24", dot: "#f59e0b" },
  APPROVED:              { label: "Approved",          bg: "#3a2a1a", color: "#FF2E11", dot: "#FF2E11" },
  REJECTED:              { label: "Rejected",          bg: "#3a1a1a", color: "#f87171", dot: "#ef4444" },
  CLOSED:                { label: "Closed",            bg: "#1f1f1f", color: "#9ca3af", dot: "#6b7280" },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.REPORTED;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: c.bg, color: c.color, padding: "3px 9px", borderRadius: 99,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
      border: `1px solid ${c.dot}35`, whiteSpace: "nowrap", flexShrink: 0,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot }} />
      {c.label}
    </span>
  );
}

interface DeptStat {
  id: string;
  name: string;
  slug?: string;
  management_mode?: string;
  total: number;
  resolved: number;
  open: number;
}

interface AdminDashboardUIProps {
  user: any;
  profile: any;
  initialStats: { total: number; resolved: number; open: number; departments: number };
  initialDeptStats: DeptStat[];
  initialRecent: any[];
}

export default function AdminDashboardUI({
  user, profile, initialStats, initialDeptStats, initialRecent
}: AdminDashboardUIProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'PREDICTIVE_ALERTS' | 'OVERVIEW'>('PREDICTIVE_ALERTS');
  const [unreadAlerts, setUnreadAlerts] = useState<number>(0);
  const [stats] = useState(initialStats);
  const [deptStats, setDeptStats] = useState(initialDeptStats);
  const [recentIssues] = useState(initialRecent);
  const [togglingDept, setTogglingDept] = useState<string | null>(null);

  useState(() => {
    async function fetchAlertsCount() {
      try {
        const res = await fetch('/api/analytics/patterns?status=ACTIVE');
        const data = await res.json();
        if (data.unreadAlertsCount !== undefined) {
          setUnreadAlerts(data.unreadAlertsCount);
        }
      } catch (err) {
        console.warn('Failed to fetch unread alerts count:', err);
      }
    }
    fetchAlertsCount();
  });

  const handleToggleMode = async (e: React.MouseEvent, dept: DeptStat) => {
    e.stopPropagation();
    if (togglingDept) return;
    setTogglingDept(dept.id);
    
    const newMode = dept.management_mode === 'TENDER' ? 'DEPARTMENT' : 'TENDER';
    
    try {
      // 1. Update Firestore
      const deptRef = doc(db, 'departments', dept.id);
      await updateDoc(deptRef, { management_mode: newMode });
      
      // 2. Update Supabase
      if (dept.slug) {
        await supabase.from('departments').update({ management_mode: newMode }).eq('slug', dept.slug);
      } else {
        console.warn("Department slug not found, could not sync to Supabase.");
      }

      setDeptStats(prev => prev.map(d => d.id === dept.id ? { ...d, management_mode: newMode } : d));
    } catch (err) {
      console.error("Failed to toggle mode:", err);
      alert("Error toggling mode. Check console.");
    } finally {
      setTogglingDept(null);
    }
  };

  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Admin";
  const firstName = fullName.split(" ")[0];

  const statCards = [
    { label: "Total Issues",  value: stats.total,       color: "#60a5fa", bg: "#1e3a5f", icon: <FileText size={18}/> },
    { label: "Resolved",      value: stats.resolved,    color: "#10b981", bg: "#1a3a2a", icon: <CheckCircle2 size={18}/> },
    { label: "Departments",   value: stats.departments, color: "#a78bfa", bg: "#2d1f4a", icon: <Building2 size={18}/> },
  ];

  const systemHealth = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0f", fontFamily: "'Inter',-apple-system,sans-serif", color: "#ffffff" }}>
      {/* Ambient */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(167, 139, 250, 0.12) 0%, transparent 70%)", borderRadius: "50%" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1000, margin: "0 auto", padding: "0 16px 100px" }}>

        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 4px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: "linear-gradient(135deg, #7c3aed, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "white", boxShadow: "0 0 20px rgba(139, 92, 246, 0.5)" }}>
              {firstName.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.2 }}>Hello, {firstName} 👋</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500, marginTop: 2 }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => router.push("/admin/users")} style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Manage Users</button>
            <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, background: "rgba(139,92,246,0.12)", padding: "6px 12px", borderRadius: 8, border: "0.5px solid rgba(139,92,246,0.3)", letterSpacing: "0.06em" }}>
              SUPER ADMIN
            </div>
          </div>
        </header>

        {/* Tab Selector */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 16 }}>
          <button
            onClick={() => setActiveTab('PREDICTIVE_ALERTS')}
            style={{
              padding: "10px 20px", borderRadius: 12,
              background: activeTab === 'PREDICTIVE_ALERTS' ? "linear-gradient(135deg, #0ea5e9, #8b5cf6)" : "rgba(255,255,255,0.03)",
              color: "white", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8
            }}>
            🚨 Predictive Infrastructure Alerts {unreadAlerts > 0 && <span style={{ background: "#ef4444", color: "white", borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 800 }}>{unreadAlerts} NEW</span>}
          </button>

          <button
            onClick={() => setActiveTab('OVERVIEW')}
            style={{
              padding: "10px 20px", borderRadius: 12,
              background: activeTab === 'OVERVIEW' ? "linear-gradient(135deg, #0ea5e9, #8b5cf6)" : "rgba(255,255,255,0.03)",
              color: "white", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8
            }}>
            📊 Department & System Overview
          </button>
        </div>

        {activeTab === 'PREDICTIVE_ALERTS' ? (
          <PredictiveAlertsTab />
        ) : (
          <>
        <section style={{ marginBottom: 28 }}>
          <div style={{ borderRadius: 24, overflow: "hidden", border: "1.5px solid rgba(139, 92, 246, 0.25)", background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(167, 146, 119, 0.05) 100%)", padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>System Health</div>
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.25 }}>
                  {stats.open} issues open across {stats.departments} departments
                </div>
              </div>
              <span style={{ fontSize: 22, fontWeight: 900, color: "#a78bfa" }}>{systemHealth}%</span>
            </div>
            {/* Progress */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,0.05)", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ height: "100%", width: `${systemHealth}%`, borderRadius: 99, background: "linear-gradient(90deg, #7c3aed, #a78bfa)" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                {["Reported", "In Progress", "Resolved"].map((s, i) => (
                  <span key={s} style={{ fontSize: 9, fontWeight: 700, color: i === 0 ? "#a78bfa" : "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 28 }}>
          {statCards.map(stat => (
            <div key={stat.label} style={{ borderRadius: 20, padding: "16px 12px", background: "rgba(255,255,255,0.03)", border: `0.5px solid rgba(255,255,255,0.08)`, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${stat.bg}50`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, color: stat.color }}>
                {stat.icon}
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, color: "white", marginBottom: 4 }}>{stat.value}</div>
              <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)" }}>{stat.label}</div>
            </div>
          ))}
        </section>

        {/* Department Performance */}
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "0 2px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 4, height: 20, background: "#a78bfa", borderRadius: 2, boxShadow: "0 0 10px rgba(167,139,250,0.6)", display: "block" }} />
              Department Performance
            </h2>
            <button onClick={() => router.push("/admin/reports")} style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.08em", background: "none", border: "none", cursor: "pointer" }}>ALL ISSUES →</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {deptStats.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "0.5px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>No departments found.</p>
              </div>
            ) : (
              deptStats.map(dept => {
                const rate = dept.total > 0 ? Math.round((dept.resolved / dept.total) * 100) : 0;
                const barColor = rate >= 70 ? "#10b981" : rate >= 40 ? "#fbbf24" : "#ef4444";
                return (
                  <div key={dept.id} style={{ borderRadius: 18, padding: "14px 16px", border: "0.5px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", cursor: "pointer" }} onClick={() => router.push("/admin/reports")}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(139,92,246,0.1)", border: "0.5px solid rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Building2 size={16} color="#a78bfa" />
                        </div>
                        <div>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2, display: "flex", alignItems: "center", gap: 8 }}>
                          {dept.name}
                          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: dept.management_mode === 'TENDER' ? 'rgba(59,130,246,0.2)' : 'rgba(167,139,250,0.2)', color: dept.management_mode === 'TENDER' ? '#60a5fa' : '#a78bfa', textTransform: 'uppercase' }}>
                            {dept.management_mode || 'DEPARTMENT'}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{dept.total} total · {dept.open} open</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <button 
                        onClick={(e) => handleToggleMode(e, dept)}
                        disabled={togglingDept === dept.id}
                        style={{ fontSize: 10, fontWeight: 800, padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", cursor: togglingDept === dept.id ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        {togglingDept === dept.id ? <RefreshCw size={10} className="animate-spin" /> : null}
                        SWITCH TO {dept.management_mode === 'TENDER' ? 'GOV' : 'TENDER'}
                      </button>
                      
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 900, color: barColor }}>{rate}%</span>
                        <ArrowRight size={10} color="#a78bfa" />
                      </div>
                    </div>
                  </div>
                  <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 99, width: `${rate}%`, background: `linear-gradient(90deg, ${barColor}, ${barColor}99)` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "0 2px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 4, height: 20, background: "#fbbf24", borderRadius: 2, boxShadow: "0 0 10px rgba(251,191,36,0.5)", display: "block" }} />
              Recent Activity
            </h2>
            <button onClick={() => router.push("/admin/reports")} style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", background: "none", border: "none", cursor: "pointer" }}>VIEW ALL</button>
          </div>
          {recentIssues.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: 20, border: "1px dashed rgba(255,255,255,0.1)" }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>No issues have been filed yet.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentIssues.map((issue: any) => (
                <div key={issue.id} onClick={() => router.push(`/issue?id=${issue.id}`)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 16, border: "0.5px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(139, 92, 246, 0.1)", border: "0.5px solid rgba(139, 92, 246, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a78bfa" }}>
                      <FileText size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{issue.title}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{new Date(issue.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                    </div>
                  </div>
                  <StatusBadge status={issue.status} />
                </div>
              ))}
            </div>
          )}
        </section>
        </>
        )}
      </div>

    </div>
  );
}
