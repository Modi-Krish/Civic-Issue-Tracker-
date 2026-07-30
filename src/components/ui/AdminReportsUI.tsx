"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, MapPin, Clock, ChevronRight } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  REPORTED:               { label: "Reported",         bg: "#1e3a5f", color: "#60a5fa", dot: "#3b82f6" },
  DEPARTMENT_ASSIGNED:    { label: "Dept. Assigned",   bg: "#1a2e3a", color: "#67e8f9", dot: "#06b6d4" },
  EMPLOYEE_ASSIGNED:      { label: "Emp. Assigned",    bg: "#1a2e3a", color: "#67e8f9", dot: "#06b6d4" },
  IN_PROGRESS:            { label: "In Progress",      bg: "#1a3a2a", color: "#34d399", dot: "#10b981" },
  SUBMITTED_FOR_APPROVAL: { label: "Pending",          bg: "#3a2a0a", color: "#fbbf24", dot: "#f59e0b" },
  APPROVED:               { label: "Approved",          bg: "#3a2a1a", color: "#FF2E11", dot: "#FF2E11" },
  REJECTED:               { label: "Rejected",          bg: "#3a1a1a", color: "#f87171", dot: "#ef4444" },
  CLOSED:                 { label: "Closed",            bg: "#1f1f1f", color: "#9ca3af", dot: "#6b7280" },
};

const FILTERS = ["All", "REPORTED", "IN_PROGRESS", "APPROVED", "CLOSED"];

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

interface AdminReportsUIProps {
  initialIssues: any[];
  departments: { id: string; name: string }[];
}

export default function AdminReportsUI({ initialIssues, departments }: AdminReportsUIProps) {
  const router = useRouter();
  const [filter, setFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = initialIssues.filter(i => {
    const okStatus = filter === "All" || i.status === filter;
    const okDept = deptFilter === "All" || i.department_id === deptFilter;
    const okSearch = !search || i.title?.toLowerCase().includes(search.toLowerCase()) || (i.issue_type || "").toLowerCase().includes(search.toLowerCase());
    return okStatus && okDept && okSearch;
  });

  const counts: Record<string, number> = FILTERS.reduce((acc, s) => {
    acc[s] = s === "All" ? initialIssues.length : initialIssues.filter(i => i.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0f", fontFamily: "'Inter',-apple-system,sans-serif", color: "#ffffff" }}>
      {/* Ambient */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -80, left: "15%", width: 380, height: 240, background: "radial-gradient(ellipse, rgba(139, 92, 246, 0.08) 0%, transparent 70%)", borderRadius: "50%" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 500, margin: "0 auto", padding: "0 16px 100px" }}>

        {/* Sticky Header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(13, 13, 15, 0.94)", backdropFilter: "blur(20px)",
          padding: "24px 8px 12px", margin: "0 -8px 16px",
          borderBottom: "0.5px solid rgba(255, 255, 255, 0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>Dept. Reports</h1>
              <p style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.35)", marginTop: 5, fontWeight: 600 }}>
                {initialIssues.length} total · all departments
              </p>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 10 }}>
            <Search size={14} color="rgba(255,255,255,0.3)" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              type="text" placeholder="Search all issues…" value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "12px 14px 12px 38px", borderRadius: 14, border: "0.5px solid rgba(255, 255, 255, 0.12)", background: "rgba(255, 255, 255, 0.04)", color: "white", fontSize: 14, fontWeight: 500, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Status filter pills */}
          <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none", marginBottom: 8 }}>
            {FILTERS.map(s => {
              const active = filter === s;
              const c = STATUS_CONFIG[s];
              return (
                <button key={s} onClick={() => setFilter(s)} style={{
                  display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
                  padding: "7px 14px", borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: "pointer",
                  border: `0.5px solid ${active ? (c ? c.dot + "55" : "#a78bfa55") : "rgba(255,255,255,0.08)"}`,
                  background: active ? (c ? c.bg : "rgba(139,92,246,0.15)") : "rgba(255,255,255,0.03)",
                  color: active ? (c ? c.color : "#a78bfa") : "rgba(255,255,255,0.35)",
                }}>
                  {s === "All" ? "All" : (STATUS_CONFIG[s]?.label ?? s)}
                  <span style={{ fontSize: 9, fontWeight: 800, borderRadius: 99, padding: "1px 6px", background: active ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)", color: active ? "white" : "rgba(255,255,255,0.25)" }}>
                    {counts[s] || 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Department filter pills */}
          <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
            {[{ id: "All", name: "All Depts" }, ...departments].map(d => {
              const active = deptFilter === d.id;
              return (
                <button key={d.id} onClick={() => setDeptFilter(d.id)} style={{
                  display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
                  padding: "6px 12px", borderRadius: 99, fontSize: 10, fontWeight: 700, cursor: "pointer",
                  background: active ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.03)",
                  border: `0.5px solid ${active ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.08)"}`,
                  color: active ? "#a78bfa" : "rgba(255,255,255,0.35)",
                }}>
                  {d.id !== "All" && <Building2 size={9} />}
                  {d.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Issue Cards */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
            No issues match your filters.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((issue: any) => {
              const dept = departments.find(d => d.id === issue.department_id);
              const date = new Date(issue.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
              const loc = issue.location_label?.split(",")[0] || "Unknown location";
              return (
                <div key={issue.id} onClick={() => router.push(`/issue?id=${issue.id}`)} style={{ borderRadius: 20, overflow: "hidden", border: "0.5px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", cursor: "pointer" }}>
                  <div style={{ height: 2, background: "linear-gradient(90deg, #7c3aed, transparent 80%)" }} />
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, background: "rgba(139,92,246,0.1)", border: "0.5px solid rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                        📋
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>{issue.title}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {dept?.name ?? "Unassigned"} · {issue.issue_type}
                        </div>
                      </div>
                      <ChevronRight size={14} color="rgba(255,255,255,0.2)" />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" }}>
                      <StatusBadge status={issue.status} />
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>
                          <MapPin size={11} color="#a78bfa" />
                          <span style={{ maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{loc}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>
                          <Clock size={11} />
                          {date}
                        </div>
                      </div>
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
