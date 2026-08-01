"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, CheckCircle2, ArrowRight, Building2 } from 'lucide-react';
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
        <header style={{ padding: "16px 0 20px" }} className="flex flex-wrap items-center justify-between gap-3">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg, #7c3aed, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "white", boxShadow: "0 0 20px rgba(139, 92, 246, 0.5)" }} className="shrink-0">
              {firstName.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.2 }}>Hello, {firstName} 👋</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500, marginTop: 2 }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }} className="w-full sm:w-auto justify-between sm:justify-end">
            <button onClick={() => router.push("/admin/users")} style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", minHeight: 38 }}>Manage Users</button>
            <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, background: "rgba(139,92,246,0.12)", padding: "6px 12px", borderRadius: 8, border: "0.5px solid rgba(139,92,246,0.3)", letterSpacing: "0.06em" }}>
              SUPER ADMIN
            </div>
          </div>
        </header>

        {/* Tab Selector (Horizontal Scroll on Mobile) */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 14, overflowX: "auto", WebkitOverflowScrolling: "touch", width: "100%", maxWidth: "100%" }} className="no-scrollbar">
          <button
            onClick={() => setActiveTab('PREDICTIVE_ALERTS')}
            style={{
              padding: "10px 16px", borderRadius: 12,
              background: activeTab === 'PREDICTIVE_ALERTS' ? "linear-gradient(135deg, #0ea5e9, #8b5cf6)" : "rgba(255,255,255,0.03)",
              color: "white", fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", flexShrink: 0, minHeight: 44
            }}>
            🚨 Predictive Alerts {unreadAlerts > 0 && <span style={{ background: "#ef4444", color: "white", borderRadius: 99, padding: "2px 7px", fontSize: 9, fontWeight: 800 }}>{unreadAlerts} NEW</span>}
          </button>

          <button
            onClick={() => setActiveTab('OVERVIEW')}
            style={{
              padding: "10px 16px", borderRadius: 12,
              background: activeTab === 'OVERVIEW' ? "linear-gradient(135deg, #0ea5e9, #8b5cf6)" : "rgba(255,255,255,0.03)",
              color: "white", fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", flexShrink: 0, minHeight: 44
            }}>
            📊 System Overview
          </button>
        </div>

        {activeTab === 'PREDICTIVE_ALERTS' ? (
          <PredictiveAlertsTab />
        ) : (
          <>
            <section style={{ marginBottom: 24 }}>
              <div style={{ borderRadius: 24, overflow: "hidden", border: "1.5px solid rgba(139, 92, 246, 0.25)", background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(167, 146, 119, 0.05) 100%)", padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>System Health</div>
                    <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.25 }}>
                      {stats.open} issues open across {stats.departments} departments
                    </div>
                  </div>
                  <span style={{ fontSize: 22, fontWeight: 900, color: "#a78bfa" }}>{systemHealth}%</span>
                </div>

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

            {/* Stats Grid */}
            <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
              {statCards.map(stat => (
                <div key={stat.label} style={{ borderRadius: 18, padding: "14px 10px", background: "rgba(255,255,255,0.03)", border: `0.5px solid rgba(255,255,255,0.08)`, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: `${stat.bg}50`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, color: stat.color }}>
                    {stat.icon}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, color: "white", marginBottom: 4 }}>{stat.value}</div>
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)" }}>{stat.label}</div>
                </div>
              ))}
            </section>

            {/* Department Performance */}
            <section style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "0 2px" }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 4, height: 18, background: "#a78bfa", borderRadius: 2, boxShadow: "0 0 10px rgba(167,139,250,0.6)", display: "block" }} />
                  Department Performance
                </h2>
                <button onClick={() => router.push("/admin/reports")} style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.08em", background: "none", border: "none", cursor: "pointer" }}>ALL ISSUES →</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {deptStats.length === 0 ? (
                  <div style={{ padding: "20px", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "0.5px solid rgba(255,255,255,0.06)" }}>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>No departments found.</p>
                  </div>
                ) : (
                  deptStats.map(dept => {
                    const rate = dept.total > 0 ? Math.round((dept.resolved / dept.total) * 100) : 0;
                    const barColor = rate >= 70 ? "#10b981" : rate >= 40 ? "#fbbf24" : "#ef4444";
                    return (
                      <div key={dept.id} style={{ borderRadius: 18, padding: "14px 16px", border: "0.5px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", cursor: "pointer" }} onClick={() => router.push("/admin/reports")}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>{dept.name}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button
                              onClick={(e) => handleToggleMode(e, dept)}
                              disabled={togglingDept === dept.id}
                              style={{
                                fontSize: 10, fontWeight: 800, padding: "4px 8px", borderRadius: 6,
                                background: dept.management_mode === 'TENDER' ? "rgba(139, 92, 246, 0.2)" : "rgba(255, 255, 255, 0.05)",
                                color: dept.management_mode === 'TENDER' ? "#a78bfa" : "rgba(255, 255, 255, 0.5)",
                                border: `1px solid ${dept.management_mode === 'TENDER' ? "rgba(139, 92, 246, 0.4)" : "rgba(255, 255, 255, 0.1)"}`,
                                cursor: "pointer"
                              }}>
                              {togglingDept === dept.id ? 'Updating...' : dept.management_mode === 'TENDER' ? 'Mode: Tender/Contractor' : 'Mode: Internal Dept'}
                            </button>
                            <span style={{ fontSize: 13, fontWeight: 900, color: barColor }}>{rate}%</span>
                          </div>
                        </div>
                        <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${rate}%`, borderRadius: 99, background: barColor }} />
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
