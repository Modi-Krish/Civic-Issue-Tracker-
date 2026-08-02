"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, MapPin, Clock, ChevronRight } from 'lucide-react';

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

const FILTERS = ["All", "REPORTED", "IN_PROGRESS", "APPROVED", "CLOSED"];

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
    <div style={{ minHeight: "100dvh", background: T.base, fontFamily: "'Inter',-apple-system,sans-serif", color: T.text1 }}>
      <div style={{ position: "relative", zIndex: 1, maxWidth: "100%", margin: "0 auto", padding: "0 16px 100px" }}>

        {/* Header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 50,
          background: T.base, padding: "24px 8px 12px", margin: "0 -8px 16px",
          borderBottom: `1px solid ${T.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", margin: 0, color: T.text1 }}>Dept. Reports</h1>
              <p style={{ fontSize: 11, color: T.text3, marginTop: 5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {initialIssues.length} total · all departments
              </p>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Search size={14} color={T.text3} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              type="text" placeholder="Search all issues…" value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "12px 14px 12px 40px", borderRadius: 14, border: `1px solid ${T.border}`, background: T.raised, color: T.text1, fontSize: 14, fontWeight: 600, outline: "none", boxSizing: "border-box", boxShadow: SH.insetSoft }}
            />
          </div>

          {/* Status filter pills */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none", marginBottom: 8 }} className="no-scrollbar">
            {FILTERS.map(s => {
              const active = filter === s;
              const c = STATUS_CONFIG[s];
              return (
                <button key={s} onClick={() => setFilter(s)} style={{
                  display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
                  padding: "8px 16px", borderRadius: 99, fontSize: 11, fontWeight: 800, cursor: "pointer",
                  border: active ? "none" : `1px solid ${T.border}`,
                  background: active ? (c ? c.bg : T.accentTint) : T.raised,
                  color: active ? (c ? c.color : T.accentDark) : T.text3,
                  boxShadow: active ? SH.insetSoft : SH.raisedSm
                }}>
                  {s === "All" ? "All" : (STATUS_CONFIG[s]?.label ?? s)}
                  <span style={{ fontSize: 9, fontWeight: 900, borderRadius: 99, padding: "2px 8px", background: active ? "rgba(0,0,0,0.08)" : T.base, color: active ? (c ? c.color : T.accentDark) : T.text3, boxShadow: active ? "none" : SH.insetSoft }}>
                    {counts[s] || 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Department filter pills */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }} className="no-scrollbar">
            {[{ id: "All", name: "All Depts" }, ...departments].map(d => {
              const active = deptFilter === d.id;
              return (
                <button key={d.id} onClick={() => setDeptFilter(d.id)} style={{
                  display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
                  padding: "8px 16px", borderRadius: 99, fontSize: 11, fontWeight: 800, cursor: "pointer",
                  background: active ? T.accentTint : T.raised,
                  border: active ? "none" : `1px solid ${T.border}`,
                  color: active ? T.accentDark : T.text3,
                  boxShadow: active ? SH.insetSoft : SH.raisedSm
                }}>
                  {d.id !== "All" && <Building2 size={12} />}
                  {d.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Issue Cards */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: T.text3, fontSize: 13, fontWeight: 600 }}>
            No issues match your filters.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((issue: any) => {
              const dept = departments.find(d => d.id === issue.department_id);
              const date = new Date(issue.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
              const loc = issue.location_label?.split(",")[0] || "Unknown location";
              
              return (
                <div key={issue.id} onClick={() => router.push(`/issue?id=${issue.id}`)} style={{ borderRadius: 20, background: T.base, border: `1px solid ${T.border}`, cursor: "pointer", boxShadow: SH.insetSoft, overflow: "hidden" }}>
                  <div style={{ padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 16, flexShrink: 0, background: T.raised, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: SH.raisedSm }}>
                        📋
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: T.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>{issue.title}</div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: T.text3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {dept?.name ?? "Unassigned"} · {issue.issue_type}
                        </div>
                      </div>
                      <ChevronRight size={16} color={T.text3} />
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
                      <StatusBadge status={issue.status} />
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: T.text3, fontWeight: 700 }}>
                          <MapPin size={12} color={T.accent} />
                          <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{loc}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: T.text3, fontWeight: 700 }}>
                          <Clock size={12} />
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
