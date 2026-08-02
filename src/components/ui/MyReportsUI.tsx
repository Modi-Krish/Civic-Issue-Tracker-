"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Plus, MapPin, Clock, ChevronRight } from "lucide-react";

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
  base:         "#EDEBE4",
  raised:       "#F5F3EC",
  border:       "#DDD9CE",
  text1:        "#2C2C2A",
  text2:        "#5F5E5A",
  text3:        "#888780",
  accent:       "#1D9E75",
  accentDark:   "#167A5B",
  accentTint:   "#E1F5EE",
  accentOnTint: "#085041",
  shL: "rgba(255,255,255,0.75)",
  shD: "rgba(0,0,0,0.09)",
} as const;

const SH = {
  raised:    `8px 8px 16px ${T.shD}, -8px -8px 16px ${T.shL}`,
  raisedSm:  `4px 4px 8px ${T.shD}, -4px -4px 8px ${T.shL}`,
  inset:     `inset 5px 5px 10px ${T.shD}, inset -5px -5px 10px ${T.shL}`,
  insetSoft: `inset 3px 3px 7px ${T.shD}, inset -3px -3px 7px ${T.shL}`,
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  REPORTED:               { label: "Reported",         bg: "#E6F1FB", fg: "#0C447C", dot: "#0C447C" },
  IN_PROGRESS:            { label: "In Progress",      bg: "#EAF3DE", fg: "#27500A", dot: "#27500A" },
  APPROVED:               { label: "Approved",         bg: "#E1F5EE", fg: "#085041", dot: "#1D9E75" },
  DEPARTMENT_ASSIGNED:    { label: "Dept. Assigned",   bg: "#E6F1FB", fg: "#0C447C", dot: "#0C447C" },
  EMPLOYEE_ASSIGNED:      { label: "Emp. Assigned",    bg: "#EEEDFE", fg: "#3C3489", dot: "#3C3489" },
  SUBMITTED_FOR_APPROVAL: { label: "Pending",          bg: "#FAEEDA", fg: "#854F0B", dot: "#854F0B" },
  REJECTED:               { label: "Rejected",         bg: "#FCEBEB", fg: "#791F1F", dot: "#791F1F" },
  CLOSED:                 { label: "Closed",           bg: "#F0EEE8", fg: "#888780", dot: "#888780" },
};

// ── Issue type dept-color chips ───────────────────────────────────────────────
const TYPE_META: Record<string, { emoji: string; bg: string; fg: string }> = {
  "Road Damage":       { emoji: "🚧", bg: "#E6F1FB", fg: "#0C447C" },
  "Water Leakage":     { emoji: "💧", bg: "#EAF3DE", fg: "#27500A" },
  "Electricity Fault": { emoji: "⚡", bg: "#FAEEDA", fg: "#854F0B" },
  "Sanitation":        { emoji: "🧹", bg: "#FAECE7", fg: "#712B13" },
  "Streetlight":       { emoji: "💡", bg: "#FAEEDA", fg: "#854F0B" },
  "Drainage":          { emoji: "🌊", bg: "#EAF3DE", fg: "#27500A" },
  "Other":             { emoji: "📋", bg: "#EEEDFE", fg: "#3C3489" },
  default:             { emoji: "📋", bg: "#EEEDFE", fg: "#3C3489" },
};

const FILTERS = ["All", "REPORTED", "IN_PROGRESS", "APPROVED", "CLOSED"];

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.REPORTED;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: c.bg, color: c.fg,
      padding: "3px 10px", borderRadius: 99,
      fontSize: 10, fontWeight: 700,
      letterSpacing: "0.05em", textTransform: "uppercase",
      whiteSpace: "nowrap", flexShrink: 0,
      boxShadow: SH.raisedSm,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  );
}

// ── Issue Card ────────────────────────────────────────────────────────────────
function IssueCard({ issue }: { issue: any }) {
  const router = useRouter();
  const meta = TYPE_META[issue.issue_type] ?? TYPE_META.default;
  const date = new Date(
    issue.created_at?.toDate ? issue.created_at.toDate() : issue.created_at
  ).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const loc = issue.location_label?.split(",")[0] ?? "Near you";

  return (
    <div
      onClick={() => router.push(`/issue?id=${issue.id}`)}
      style={{
        borderRadius: 20, overflow: "hidden",
        background: T.raised,
        boxShadow: SH.raised,
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Dept-color top stripe */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${meta.fg}55, transparent 80%)` }} />

      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          {/* Emoji chip */}
          <div style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: meta.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20,
            boxShadow: SH.raisedSm,
          }}>
            {meta.emoji}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14.5, fontWeight: 800, letterSpacing: "-0.01em",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              marginBottom: 3, color: T.text1,
            }}>
              {issue.title}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: meta.fg, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {issue.issue_type}
            </div>
          </div>

          <ChevronRight size={14} color={T.text3} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" }}>
          <StatusBadge status={issue.status} />

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: T.text3, fontWeight: 500 }}>
              <MapPin size={11} color={T.accent} />
              <span style={{ maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{loc}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: T.text3, fontWeight: 500 }}>
              <Clock size={11} color={T.text3} />
              {date}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
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

  const counts = FILTERS.reduce((acc: Record<string, number>, s) => {
    acc[s] = s === "All" ? issues.length : issues.filter(i => i.status === s).length;
    return acc;
  }, {});

  return (
    <div style={{
      minHeight: "100dvh",
      background: T.base,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: T.text1,
    }}>
      <div style={{ maxWidth: 500, margin: "0 auto", padding: "0 16px 100px" }}>

        {/* ── Sticky Header ── */}
        <div style={{
          position: "sticky", top: 0, zIndex: 50,
          background: T.raised,
          boxShadow: `0 4px 16px ${T.shD}`,
          borderBottom: `1px solid ${T.border}`,
          padding: "24px 0 12px",
          margin: "0 -16px",
          paddingLeft: 16, paddingRight: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", margin: 0, color: T.text1 }}>
                My Reports
              </h1>
              <p style={{ fontSize: 11, color: T.text3, marginTop: 4, fontWeight: 600 }}>
                {issues.length} total report{issues.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link href="/report" style={{
              width: 40, height: 40, borderRadius: 13,
              background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: SH.raisedSm, flexShrink: 0, textDecoration: "none",
            }}>
              <Plus color="white" size={18} strokeWidth={2.5} />
            </Link>
          </div>

          {/* Search bar */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Search size={14} color={T.text3} style={{
              position: "absolute", left: 14, top: "50%",
              transform: "translateY(-50%)", pointerEvents: "none",
            }} />
            <input
              type="text"
              placeholder="Search your reports…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "12px 14px 12px 40px",
                borderRadius: 14, border: `1px solid ${T.border}`,
                background: T.raised,
                boxShadow: SH.insetSoft,
                color: T.text1, fontSize: 14, fontWeight: 500,
                outline: "none", boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Filter pills */}
          <div style={{
            display: "flex", gap: 7,
            overflowX: "auto", paddingBottom: 4,
            msOverflowStyle: "none" as any, scrollbarWidth: "none" as any,
          }}>
            {FILTERS.map(s => {
              const active = filter === s;
              const cfg = STATUS_CONFIG[s as keyof typeof STATUS_CONFIG];
              return (
                <button key={s} onClick={() => setFilter(s)} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  flexShrink: 0, padding: "7px 14px", borderRadius: 99,
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                  border: "none",
                  background: active ? (cfg ? cfg.bg : T.accentTint) : T.raised,
                  color: active ? (cfg ? cfg.fg : T.accentOnTint) : T.text3,
                  boxShadow: active ? SH.insetSoft : SH.raisedSm,
                  fontFamily: "inherit",
                  WebkitTapHighlightColor: "transparent",
                }}>
                  {s === "All" ? "All" : (STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label ?? s)}
                  <span style={{
                    fontSize: 9, fontWeight: 800, borderRadius: 99, padding: "1px 6px",
                    background: active ? "rgba(0,0,0,0.1)" : T.base,
                    color: active ? "inherit" : T.text3,
                  }}>
                    {counts[s] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ paddingTop: 16 }}>
          {issues.length === 0 ? (
            <div style={{
              padding: "60px 20px", textAlign: "center",
              background: T.raised, borderRadius: 24,
              boxShadow: SH.inset, marginTop: 8,
            }}>
              <div style={{ fontSize: 44, marginBottom: 16, opacity: 0.5 }}>📋</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: T.text1 }}>No reports yet</h3>
              <p style={{ fontSize: 13, color: T.text3, lineHeight: 1.6, maxWidth: 220, margin: "0 auto 24px" }}>
                Start making your city better by reporting an issue.
              </p>
              <button
                onClick={() => router.push("/report")}
                style={{
                  padding: "12px 24px", borderRadius: 14,
                  background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
                  border: "none", color: "white",
                  fontWeight: 800, fontSize: 14,
                  cursor: "pointer", fontFamily: "inherit",
                  boxShadow: SH.raisedSm,
                }}
              >
                File a Report
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "60px 20px",
              color: T.text3, fontSize: 13,
            }}>
              No results match your search.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map(issue => <IssueCard key={issue.id} issue={issue} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
