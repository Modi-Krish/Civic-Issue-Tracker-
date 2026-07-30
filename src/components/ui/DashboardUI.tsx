"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Star, Plus, CheckCircle2, Trophy, ArrowRight, FileText } from 'lucide-react';

const STATUS_CONFIG = {
  REPORTED:              { label: "Reported",         bg: "#1e3a5f", color: "#60a5fa", dot: "#3b82f6" },
  DEPARTMENT_ASSIGNED:   { label: "Dept. Assigned",   bg: "#1a2e3a", color: "#67e8f9", dot: "#06b6d4" },
  EMPLOYEE_ASSIGNED:     { label: "Emp. Assigned",    bg: "#1a2e3a", color: "#67e8f9", dot: "#06b6d4" },
  IN_PROGRESS:           { label: "In Progress",      bg: "#1a3a2a", color: "#34d399", dot: "#10b981" },
  SUBMITTED_FOR_APPROVAL:{ label: "Pending Approval", bg: "#3a2a0a", color: "#fbbf24", dot: "#f59e0b" },
  APPROVED:              { label: "Approved",          bg: "#3a2a1a", color: "#FF2E11", dot: "#FF2E11" },
  REJECTED:              { label: "Rejected",          bg: "#3a1a1a", color: "#f87171", dot: "#ef4444" },
  CLOSED:                { label: "Closed",            bg: "#1f1f1f", color: "#9ca3af", dot: "#6b7280" },
};

const PROGRESS_MAP = {
  REPORTED: 15, DEPARTMENT_ASSIGNED: 30, EMPLOYEE_ASSIGNED: 45,
  IN_PROGRESS: 60, SUBMITTED_FOR_APPROVAL: 80, APPROVED: 100, REJECTED: 100, CLOSED: 100,
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.REPORTED;
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

function ProgressTracker({ status }: { status: string }) {
  const pct = PROGRESS_MAP[status as keyof typeof PROGRESS_MAP] || 5;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 5 }}>
          <Star style={{ width: 12, height: 12, color: "#FF2E11", fill: "#FF2E11" }} />
          Live Status
        </span>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#FF2E11" }}>{pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,0.05)", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: "linear-gradient(90deg, #FF2E11, #A79277)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        {["Reported", "Assigned", "Resolved"].map((s, i) => (
          <span key={s} style={{ fontSize: 9, fontWeight: 700, color: i === 0 ? "#FF5E41" : "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

interface DashboardUIProps {
  user: any;
  profile: any;
  initialStats: { reported: number; resolved: number; points: number };
  initialNearby: any[];
  initialRecent: any[];
  initialActive: any;
}

export default function DashboardUI({ user, profile, initialStats, initialNearby, initialRecent, initialActive }: DashboardUIProps) {
  const router = useRouter();
  const [statsData] = useState(initialStats);
  const [nearbyIssues] = useState(initialNearby);
  const [recentIssues] = useState(initialRecent);
  const [activeIssue] = useState(initialActive);

  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Citizen";
  const firstName = fullName.split(" ")[0];

  const stats = [
    { label: "Reported", value: statsData.reported, color: "#60a5fa", bg: "#1e3a5f", icon: <FileText size={18}/> },
    { label: "Resolved", value: statsData.resolved, color: "#10b981", bg: "#1a3a2a", icon: <CheckCircle2 size={18}/> },
    { label: "Points", value: statsData.points, color: "#fbbf24", bg: "#3a2a0a", icon: <Trophy size={18}/> },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0f", fontFamily: "'Inter',-apple-system,sans-serif", color: "#ffffff" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(255, 46, 17, 0.1) 0%, transparent 70%)", borderRadius: "50%" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 500, margin: "0 auto", padding: "0 16px 100px" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 4px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: "linear-gradient(135deg, #FF2E11, #A79277)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "white", boxShadow: "0 0 20px rgba(255, 46, 17, 0.4)" }}>
              {firstName.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.2 }}>Hello, {firstName} 👋</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500, marginTop: 2 }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, background: "rgba(255,255,255,0.05)", padding: "6px 12px", borderRadius: 8, border: "0.5px solid rgba(255,255,255,0.08)" }}>
            CITIZEN
          </div>
        </header>

        <section style={{ marginBottom: 28 }}>
          {activeIssue ? (
            <div style={{ borderRadius: 24, overflow: "hidden", border: "1.5px solid rgba(255, 46, 17, 0.25)", background: "linear-gradient(135deg, rgba(255, 46, 17, 0.1) 0%, rgba(167, 146, 119, 0.05) 100%)", padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#FF5E41", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Active Tracker</div>
                  <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.25 }}>{activeIssue.title}</div>
                </div>
                <StatusBadge status={activeIssue.status} />
              </div>
              <ProgressTracker status={activeIssue.status} />
            </div>
          ) : (
            <div style={{ borderRadius: 24, padding: "28px 24px", background: "linear-gradient(135deg, #FF2E11 0%, #A79277 100%)", boxShadow: "0 20px 60px rgba(255, 46, 17, 0.4)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", bottom: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255, 255, 255, 0.1)", pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: 10, color: "white" }}>Your city<br />is in your hands.</div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 20, maxWidth: 200, lineHeight: 1.5 }}>Report local issues to build a better neighborhood.</p>
                <button onClick={() => router.push("/report")} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 12, background: "white", color: "#FF2E11", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer" }}>
                  <Plus size={14} />
                  Report Issue
                </button>
              </div>
            </div>
          )}
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 28 }}>
          {stats.map(stat => (
            <div key={stat.label} style={{ borderRadius: 20, padding: "16px 12px", background: "rgba(255,255,255,0.03)", border: `0.5px solid rgba(255,255,255,0.08)`, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${stat.bg}50`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, color: stat.color }}>
                {stat.icon}
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, color: "white", marginBottom: 4 }}>{stat.value}</div>
              <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)" }}>{stat.label}</div>
            </div>
          ))}
        </section>

        <section style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "0 2px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 4, height: 20, background: "#FF2E11", borderRadius: 2, boxShadow: "0 0 10px #FF2E11", display: "block" }} />
              Nearby Problems
            </h2>
            <button onClick={() => router.push("/map")} style={{ fontSize: 11, fontWeight: 700, color: "#FF5E41", textTransform: "uppercase", letterSpacing: "0.08em", background: "none", border: "none", cursor: "pointer" }}>OPEN MAP →</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {nearbyIssues.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "0.5px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Everything looks quiet around here.</p>
              </div>
            ) : (
              nearbyIssues.map(item => (
                <div key={item.id} onClick={() => router.push(`/issue?id=${item.id}`)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 18, border: "0.5px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", cursor: "pointer" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                    📍
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: 3 }}>
                        <MapPin size={10} color="#FF5E41" />
                        {item.location_label?.split(',')[0] || "Near you"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                    <StatusBadge status={item.status} />
                    <ArrowRight size={10} color="#FF5E41" />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "0 2px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 4, height: 20, background: "#fbbf24", borderRadius: 2, boxShadow: "0 0 10px rgba(251,191,36,0.5)", display: "block" }} />
              Your History
            </h2>
            <button onClick={() => router.push("/my-reports")} style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", background: "none", border: "none", cursor: "pointer" }}>VIEW ALL</button>
          </div>
          {recentIssues.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: 20, border: "1px dashed rgba(255,255,255,0.1)" }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Help your city by reporting an issue!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentIssues.map(issue => (
                <div key={issue.id} onClick={() => router.push(`/issue?id=${issue.id}`)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 16, border: "0.5px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255, 46, 17, 0.1)", border: "0.5px solid rgba(255, 46, 17, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF5E41" }}>
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
      </div>

      
    </div>
  );
}
