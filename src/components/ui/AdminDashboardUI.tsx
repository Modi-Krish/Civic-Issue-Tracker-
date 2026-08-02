"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, CheckCircle2, ArrowRight, Building2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/lib/supabase/client';
import PredictiveAlertsTab from '@/components/admin/PredictiveAlertsTab';

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
  insetSoft:`inset 3px 3px 7px ${T.shD}, -3px -3px 7px ${T.shL}`,
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  REPORTED:              { label: "Reported",         color: "#0C447C", bg: "#E6F1FB", dot: "#0C447C" },
  DEPARTMENT_ASSIGNED:   { label: "Dept. Assigned",   color: "#3C3489", bg: "#EEEDFE", dot: "#3C3489" },
  EMPLOYEE_ASSIGNED:     { label: "Emp. Assigned",    color: "#3C3489", bg: "#EEEDFE", dot: "#3C3489" },
  IN_PROGRESS:           { label: "In Progress",      color: "#27500A", bg: "#EAF3DE", dot: "#27500A" },
  SUBMITTED_FOR_APPROVAL:{ label: "Pending Approval", color: "#854F0B", bg: "#FAEEDA", dot: "#854F0B" },
  APPROVED:              { label: "Approved",          color: "#085041", bg: "#E1F5EE", dot: "#085041" },
  REJECTED:              { label: "Rejected",          color: "#791F1F", bg: "#FCEBEB", dot: "#791F1F" },
  CLOSED:                { label: "Closed",            color: "#085041", bg: "#E1F5EE", dot: "#085041" },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.REPORTED;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: c.bg, color: c.color, padding: "3px 9px", borderRadius: 99,
      fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase",
      boxShadow: SH.raisedSm, whiteSpace: "nowrap", flexShrink: 0,
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
        if (data.unreadAlertsCount !== undefined) setUnreadAlerts(data.unreadAlertsCount);
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
      const deptRef = doc(db, 'departments', dept.id);
      await updateDoc(deptRef, { management_mode: newMode });
      if (dept.slug) {
        await supabase.from('departments').update({ management_mode: newMode }).eq('slug', dept.slug);
      }
      setDeptStats(prev => prev.map(d => d.id === dept.id ? { ...d, management_mode: newMode } : d));
    } catch (err) {
      console.error("Failed to toggle mode:", err);
      alert("Error toggling mode.");
    } finally {
      setTogglingDept(null);
    }
  };

  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Admin";
  const firstName = fullName.split(" ")[0];

  const statCards = [
    { label: "Total Issues",  value: stats.total,       color: "#0C447C", bg: "#E6F1FB", icon: <FileText size={20}/> },
    { label: "Resolved",      value: stats.resolved,    color: "#27500A", bg: "#EAF3DE", icon: <CheckCircle2 size={20}/> },
    { label: "Open",          value: stats.open,        color: "#791F1F", bg: "#FCEBEB", icon: <ArrowRight size={20}/> },
    { label: "Departments",   value: stats.departments, color: "#3C3489", bg: "#EEEDFE", icon: <Building2 size={20}/> },
  ];

  const systemHealth = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;

  return (
    <div style={{ minHeight: "100dvh", background: T.base, fontFamily: "'Inter',-apple-system,sans-serif", color: T.text1 }}>
      <style>{`
        .admin-container {
          width: 100%;
          padding: 0 16px calc(90px + env(safe-area-inset-bottom, 0px));
        }
        @media (min-width: 768px) {
          .admin-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 32px 90px;
          }
        }
        .admin-stat-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        @media (min-width: 768px) {
          .admin-stat-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }
        }
        .admin-dept-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 768px) {
          .admin-dept-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1280px) {
          .admin-dept-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>

      <div className="admin-container">
        {/* Header */}
        <header style={{ padding: "24px 0 20px" }} className="flex flex-wrap items-center justify-between gap-3">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "white", boxShadow: SH.raisedSm, flexShrink: 0 }}>
              {firstName.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.2, color: T.text1 }}>Hello, {firstName} 👋</div>
              <div style={{ fontSize: 12, color: T.text3, fontWeight: 600, marginTop: 2 }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => router.push("/admin/users")} style={{ padding: "8px 16px", borderRadius: 12, background: T.raised, border: `1px solid ${T.border}`, color: T.text1, fontSize: 12, fontWeight: 800, cursor: "pointer", minHeight: 38, boxShadow: SH.raisedSm }}>Manage Users</button>
            <div style={{ fontSize: 11, color: "#791F1F", fontWeight: 800, background: "#FCEBEB", padding: "6px 12px", borderRadius: 10, letterSpacing: "0.06em", boxShadow: SH.raisedSm }}>
              SUPER ADMIN
            </div>
          </div>
        </header>

        {/* Tab Selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: `1px solid ${T.border}`, paddingBottom: 16, overflowX: "auto", WebkitOverflowScrolling: "touch" }} className="no-scrollbar">
          {[
            { key: 'PREDICTIVE_ALERTS', label: `🚨 Predictive Alerts`, badge: unreadAlerts > 0 ? `${unreadAlerts} NEW` : null },
            { key: 'OVERVIEW', label: '📊 System Overview', badge: null },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: "10px 18px", borderRadius: 14,
                background: activeTab === tab.key ? T.raised : 'transparent',
                color: activeTab === tab.key ? T.accentDark : T.text3,
                fontSize: 12, fontWeight: 800,
                border: activeTab === tab.key ? `1px solid ${T.border}` : "1px solid transparent",
                boxShadow: activeTab === tab.key ? SH.raisedSm : 'none',
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
                whiteSpace: "nowrap", flexShrink: 0, minHeight: 44,
              }}
            >
              {tab.label}
              {tab.badge && <span style={{ background: "#791F1F", color: "white", borderRadius: 99, padding: "2px 7px", fontSize: 10, fontWeight: 900 }}>{tab.badge}</span>}
            </button>
          ))}
        </div>

        {activeTab === 'PREDICTIVE_ALERTS' ? (
          <PredictiveAlertsTab />
        ) : (
          <>
            {/* Stats grid — 4-col on desktop */}
            <section style={{ marginBottom: 28 }}>
              <div className="admin-stat-grid">
                {statCards.map(stat => (
                  <div key={stat.label} style={{ borderRadius: 20, padding: "18px 16px", background: T.raised, border: `1px solid ${T.border}`, boxShadow: SH.raised, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: stat.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, color: stat.color, boxShadow: SH.insetSoft }}>
                      {stat.icon}
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, color: T.text1, marginBottom: 6 }}>{stat.value}</div>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: T.text3 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* System health */}
            <section style={{ marginBottom: 28 }}>
              <div style={{ borderRadius: 24, background: T.raised, border: `1px solid ${T.border}`, boxShadow: SH.raised, padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: T.accent, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>System Health</div>
                    <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.25, color: T.text1 }}>
                      {stats.open} issues open across {stats.departments} departments
                    </div>
                  </div>
                  <span style={{ fontSize: 32, fontWeight: 900, color: T.accent }}>{systemHealth}%</span>
                </div>
                <div style={{ height: 10, borderRadius: 99, background: T.base, overflow: "hidden", boxShadow: SH.insetSoft }}>
                  <div style={{ height: "100%", width: `${systemHealth}%`, borderRadius: 99, background: `linear-gradient(90deg, ${T.accent}, ${T.accentDark})` }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                  {["Reported", "In Progress", "Resolved"].map((s, i) => (
                    <span key={s} style={{ fontSize: 10, fontWeight: 800, color: i === 0 ? T.accentDark : T.text3, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s}</span>
                  ))}
                </div>
              </div>
            </section>

            {/* Department Performance — responsive grid */}
            <section style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "0 4px" }}>
                <h2 style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.02em", color: T.text1, margin: 0 }}>
                  Department Performance
                </h2>
                <button onClick={() => router.push("/admin/reports")} style={{ fontSize: 11, fontWeight: 800, color: T.accentDark, textTransform: "uppercase", letterSpacing: "0.08em", background: "none", border: "none", cursor: "pointer" }}>ALL ISSUES →</button>
              </div>
              <div className="admin-dept-grid">
                {deptStats.length === 0 ? (
                  <div style={{ padding: "30px", textAlign: "center", background: T.raised, borderRadius: 20, boxShadow: SH.insetSoft }}>
                    <p style={{ fontSize: 13, color: T.text3, fontWeight: 600 }}>No departments found.</p>
                  </div>
                ) : (
                  deptStats.map(dept => {
                    const rate = dept.total > 0 ? Math.round((dept.resolved / dept.total) * 100) : 0;
                    const barColor = rate >= 70 ? "#085041" : rate >= 40 ? "#854F0B" : "#791F1F";
                    return (
                      <div key={dept.id} style={{ borderRadius: 20, padding: "16px 20px", background: T.raised, border: `1px solid ${T.border}`, boxShadow: SH.raised, cursor: "pointer" }} onClick={() => router.push("/admin/reports")}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                          <span style={{ fontSize: 15, fontWeight: 900, color: T.text1 }}>{dept.name}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <button
                              onClick={(e) => handleToggleMode(e, dept)}
                              disabled={togglingDept === dept.id}
                              style={{
                                fontSize: 10, fontWeight: 800, padding: "5px 10px", borderRadius: 8,
                                background: dept.management_mode === 'TENDER' ? "#EAF3DE" : T.base,
                                color: dept.management_mode === 'TENDER' ? "#27500A" : T.text3,
                                border: `1px solid ${dept.management_mode === 'TENDER' ? "#27500A30" : T.border}`,
                                cursor: "pointer", boxShadow: SH.raisedSm,
                              }}
                            >
                              {togglingDept === dept.id ? 'Updating...' : dept.management_mode === 'TENDER' ? 'Mode: Tender' : 'Mode: Internal'}
                            </button>
                            <span style={{ fontSize: 14, fontWeight: 900, color: barColor }}>{rate}%</span>
                          </div>
                        </div>
                        <div style={{ height: 8, borderRadius: 99, background: T.base, overflow: "hidden", boxShadow: SH.insetSoft }}>
                          <div style={{ height: "100%", width: `${rate}%`, borderRadius: 99, background: barColor }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: T.text3, fontWeight: 600 }}>
                          <span>{dept.resolved}/{dept.total} resolved</span>
                          <span>{dept.open} open</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
