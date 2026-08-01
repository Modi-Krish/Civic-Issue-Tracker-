"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Plus, MapPin, Clock, ChevronRight } from 'lucide-react';

const STATUS_CONFIG = {
  REPORTED:              { label: "Reported",       bg: "#1e3a5f", color: "#60a5fa", dot: "#3b82f6" },
  IN_PROGRESS:           { label: "In Progress",    bg: "#1a3a2a", color: "#34d399", dot: "#10b981" },
  APPROVED:              { label: "Approved",        bg: "#3a2a1a", color: "#FF2E11", dot: "#FF2E11" },
  DEPARTMENT_ASSIGNED:   { label: "Dept. Assigned", bg: "#1a2e3a", color: "#67e8f9", dot: "#06b6d4" },
  EMPLOYEE_ASSIGNED:     { label: "Emp. Assigned",  bg: "#1a2e3a", color: "#67e8f9", dot: "#06b6d4" },
  SUBMITTED_FOR_APPROVAL:{ label: "Pending",        bg: "#3a2a0a", color: "#fbbf24", dot: "#f59e0b" },
  REJECTED:              { label: "Rejected",        bg: "#3a1a1a", color: "#f87171", dot: "#ef4444" },
  CLOSED:                { label: "Closed",          bg: "#1f1f1f", color: "#9ca3af", dot: "#6b7280" },
};

const TYPE_META: Record<string, { emoji: string, accent: string }> = {
  "Road Damage":  { emoji: "🚧", accent: "#f59e0b" },
  "Streetlight":  { emoji: "💡", accent: "#FF2E11" },
  "Garbage":      { emoji: "🗑️", accent: "#34d399" },
  "Water":        { emoji: "💧", accent: "#60a5fa" },
  "Graffiti":     { emoji: "🎨", accent: "#f472b6" },
  "Park":         { emoji: "🌳", accent: "#4ade80" },
  default:        { emoji: "📋", accent: "#FF2E11" },
};

const FILTERS = ["All", "REPORTED", "IN_PROGRESS", "APPROVED", "CLOSED"];

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.REPORTED;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: c.bg, color: c.color,
      padding: "3px 9px", borderRadius: 99, fontSize: 10,
      fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
      border: `1px solid ${c.dot}35`, whiteSpace: "nowrap", flexShrink: 0,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot }} />
      {c.label}
    </span>
  );
}

function IssueCard({ issue }: { issue: any }) {
  const router = useRouter();
  const meta = TYPE_META[issue.issue_type] || TYPE_META.default;
  const date = new Date(issue.created_at?.toDate ? issue.created_at.toDate() : issue.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const loc  = issue.location_label?.split(",")[0] || "Near you";

  return (
    <div
      onClick={() => router.push(`/issue?id=${issue.id}`)}
      style={{
        borderRadius: 20, overflow: "hidden",
        border: "0.5px solid rgba(255, 255, 255, 0.08)",
        background: "rgba(255, 255, 255, 0.02)",
        cursor: "pointer", transition: "all 0.15s",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div style={{ height: 2, background: `linear-gradient(90deg, ${meta.accent}bb, transparent 80%)` }} />

      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: `${meta.accent}14`, border: `0.5px solid ${meta.accent}25`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>
            {meta.emoji}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3, color: "white"
            }}>
              {issue.title}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {issue.issue_type}
            </div>
          </div>

          <ChevronRight size={14} color="rgba(255,255,255,0.2)" />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" }}>
          <StatusBadge status={issue.status} />

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>
              <MapPin size={11} color="#FF2E11" />
              <span style={{ maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{loc}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>
              <Clock size={11} color="rgba(255,255,255,0.3)" />
              {date}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyReportsUI({ initialIssues }: { initialIssues: any[] }) {
  const router = useRouter();
  const [issues] = useState<any[]>(initialIssues);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = issues.filter((i: any) => {
    const okStatus = filter === "All" || i.status === filter;
    const okSearch = !search || i.title.toLowerCase().includes(search.toLowerCase()) || (i.issue_type || "").toLowerCase().includes(search.toLowerCase());
    return okStatus && okSearch;
  });

  const counts = FILTERS.reduce((acc: any, s: string) => {
    acc[s] = s === "All" ? issues.length : issues.filter(i => i.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0f", fontFamily: "'Inter',-apple-system,sans-serif", color: "#ffffff" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -80, left: "15%", width: 380, height: 240, background: "radial-gradient(ellipse, rgba(255, 46, 17, 0.08) 0%, transparent 70%)", borderRadius: "50%" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 500, margin: "0 auto", padding: "0 16px 100px" }}>
        <div style={{ 
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(13, 13, 15, 0.94)", backdropFilter: "blur(20px)",
          padding: "24px 8px 12px",
          margin: "0 -8px 16px",
          borderBottom: "0.5px solid rgba(255, 255, 255, 0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>My Reports</h1>
              <p style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.35)", marginTop: 5, fontWeight: 600 }}>
                {issues.length} total report{issues.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link href="/report" style={{
              width: 38, height: 38, borderRadius: 12,
              background: "linear-gradient(135deg,#FF2E11,#A79277)", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", boxShadow: "0 4px 14px rgba(255, 46, 17, 0.4)", flexShrink: 0
            }}>
              <Plus color="white" size={18} strokeWidth={3} />
            </Link>
          </div>

          <div style={{ position: "relative", marginBottom: 14 }}>
            <Search size={14} color="rgba(255,255,255,0.3)" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              type="text" placeholder="Search your reports…" value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "12px 14px 12px 38px", borderRadius: 14,
                border: "0.5px solid rgba(255, 255, 255, 0.12)",
                background: "rgba(255, 255, 255, 0.04)", color: "white",
                fontSize: 14, fontWeight: 500, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{
            display: "flex", gap: 7,
            overflowX: "auto", paddingBottom: 6,
            msOverflowStyle: "none", scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}>
            {FILTERS.map(s => {
              const active = filter === s;
              const c = STATUS_CONFIG[s as keyof typeof STATUS_CONFIG];
              return (
                <button key={s} onClick={() => setFilter(s)} style={{
                  display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
                  padding: "7px 14px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                  cursor: "pointer", transition: "all 0.15s",
                  border: `0.5px solid ${active ? (c ? c.dot + "55" : "#FF5E4188") : "rgba(255, 255, 255, 0.08)"}`,
                  background: active ? (c ? c.bg : "rgba(255, 46, 17, 0.15)") : "rgba(255, 255, 255, 0.03)",
                  color: active ? (c ? c.color : "#FF2E11") : "rgba(255, 255, 255, 0.35)",
                  WebkitTapHighlightColor: "transparent",
                }}>
                  {s === "All" ? "All" : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label}
                  <span style={{
                    fontSize: 9, fontWeight: 800, borderRadius: 99, padding: "1px 6px",
                    background: active ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.06)",
                    color: active ? "white" : "rgba(255, 255, 255, 0.25)",
                  }}>
                    {counts[s] || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {issues.length === 0 ? (
          <div style={{ padding: "80px 20px", textAlign: "center", borderRadius: 24, border: "1px dashed rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", marginTop: 10 }}>
             <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>📋</div>
             <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: "white" }}>No reports yet</h3>
             <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", lineHeight: 1.6, maxWidth: 220, margin: "0 auto 24px" }}>Start making your city better by reporting an issue.</p>
             <button onClick={() => router.push("/report")} style={{ padding: "12px 24px", borderRadius: 12, background: "#FF2E11", border: "none", color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>File a Report</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255, 255, 255, 0.3)", fontSize: 13 }}>
            No results match your search.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(issue => <IssueCard key={issue.id} issue={issue} />)}
          </div>
        )}
      </div>

      
    </div>
  );
}
