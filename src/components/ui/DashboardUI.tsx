"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin, Star, Plus, CheckCircle2, Trophy,
  FileText, ChevronRight,
} from "lucide-react";

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

const STATUS_CONFIG = {
  REPORTED:               { label: "Reported",         bg: "#E6F1FB", fg: "#0C447C", dot: "#0C447C" },
  DEPARTMENT_ASSIGNED:    { label: "Dept. Assigned",   bg: "#E6F1FB", fg: "#0C447C", dot: "#0C447C" },
  EMPLOYEE_ASSIGNED:      { label: "Emp. Assigned",    bg: "#EEEDFE", fg: "#3C3489", dot: "#3C3489" },
  IN_PROGRESS:            { label: "In Progress",      bg: "#EAF3DE", fg: "#27500A", dot: "#27500A" },
  SUBMITTED_FOR_APPROVAL: { label: "Pending Approval", bg: "#FAEEDA", fg: "#854F0B", dot: "#854F0B" },
  APPROVED:               { label: "Approved",         bg: "#E1F5EE", fg: "#085041", dot: "#1D9E75" },
  REJECTED:               { label: "Rejected",         bg: "#FCEBEB", fg: "#791F1F", dot: "#791F1F" },
  CLOSED:                 { label: "Closed",           bg: "#F0EEE8", fg: "#888780", dot: "#888780" },
};

const PROGRESS_MAP: Record<string, number> = {
  REPORTED: 15, DEPARTMENT_ASSIGNED: 30, EMPLOYEE_ASSIGNED: 45,
  IN_PROGRESS: 60, SUBMITTED_FOR_APPROVAL: 80,
  APPROVED: 100, REJECTED: 100, CLOSED: 100,
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.REPORTED;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: cfg.bg, color: cfg.fg,
      padding: "3px 10px", borderRadius: 99,
      fontSize: 10, fontWeight: 700,
      letterSpacing: "0.05em", textTransform: "uppercase",
      whiteSpace: "nowrap", flexShrink: 0,
      boxShadow: SH.raisedSm,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function ProgressTracker({ status }: { status: string }) {
  const pct = PROGRESS_MAP[status] ?? 15;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: T.text3,
          textTransform: "uppercase", letterSpacing: "0.1em",
          display: "flex", alignItems: "center", gap: 5,
        }}>
          <Star size={11} color={T.accent} fill={T.accent} />
          Live Status
        </span>
        <span style={{ fontSize: 12, fontWeight: 800, color: T.accent }}>{pct}%</span>
      </div>
      <div style={{
        height: 10, borderRadius: 99,
        background: T.raised,
        boxShadow: SH.insetSoft,
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: 99,
          background: `linear-gradient(90deg, ${T.accent}, ${T.accentDark})`,
          transition: "width 0.6s ease",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        {["Reported", "Assigned", "Resolved"].map((s, i) => (
          <span key={s} style={{
            fontSize: 9, fontWeight: 700,
            color: i === 0 ? T.accent : T.text3,
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({
  title, accent, action, onAction,
}: {
  title: string;
  accent: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      justifyContent: "space-between", marginBottom: 14, padding: "0 2px",
    }}>
      <h2 style={{
        fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em",
        display: "flex", alignItems: "center", gap: 9,
        margin: 0, color: T.text1,
      }}>
        <span style={{ width: 4, height: 20, background: accent, borderRadius: 2, display: "block" }} />
        {title}
      </h2>
      {action && (
        <button onClick={onAction} style={{
          fontSize: 11, fontWeight: 700,
          color: accent === T.accent ? T.accent : T.text3,
          textTransform: "uppercase", letterSpacing: "0.08em",
          background: "none", border: "none",
          cursor: "pointer", fontFamily: "inherit",
        }}>
          {action}
        </button>
      )}
    </div>
  );
}

interface DashboardUIProps {
  user: { email?: string; user_metadata?: { full_name?: string }; uid?: string };
  profile: { full_name?: string; role?: string } | null;
  initialStats: { reported: number; resolved: number; points: number };
  initialNearby: Array<{ id: string; title: string; status: string; location_label?: string }>;
  initialRecent: Array<{ id: string; title: string; status: string; created_at: string }>;
  initialActive: { id: string; title: string; status: string } | null;
}

export default function DashboardUI({
  user, profile,
  initialStats, initialNearby, initialRecent, initialActive,
}: DashboardUIProps) {
  const router = useRouter();
  const [statsData]    = useState(initialStats);
  const [nearbyIssues] = useState(initialNearby);
  const [recentIssues] = useState(initialRecent);
  const [activeIssue]  = useState(initialActive);

  const fullName  = profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Citizen";
  const firstName = fullName.split(" ")[0];
  const initial   = firstName.charAt(0).toUpperCase();
  const roleLabel = (profile?.role ?? "citizen").replace(/_/g, " ");

  const stats = [
    { label: "Reported", value: statsData.reported, bg: "#E6F1FB", fg: "#0C447C", Icon: FileText },
    { label: "Resolved", value: statsData.resolved, bg: "#EAF3DE", fg: "#27500A", Icon: CheckCircle2 },
    { label: "Points",   value: statsData.points,   bg: "#FAEEDA", fg: "#854F0B", Icon: Trophy },
  ];

  return (
    <div style={{
      minHeight: "100dvh",
      background: T.base,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: T.text1,
      overflowX: "hidden",
    }}>
      <style>{`
        .dash-container {
          width: 100%;
          max-width: 100%;
          padding: 0 16px calc(90px + env(safe-area-inset-bottom, 0px));
        }
        @media (min-width: 1024px) {
          .dash-container {
            max-width: 1300px;
            margin: 0 auto;
            padding: 0 32px 90px;
          }
        }
        .dash-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 28px;
        }
        .dash-main-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 1024px) {
          .dash-main-layout {
            grid-template-columns: 1fr 380px;
            align-items: start;
          }
        }
        .dash-issue-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        @media (min-width: 768px) {
          .dash-issue-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .dash-issue-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="dash-container">

        {/* ─── Header ─────────────────────────────────────────────── */}
        <header style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 4px 28px",
          flexWrap: "wrap", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 15,
              background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 19, fontWeight: 800, color: "#fff",
              boxShadow: SH.raised, flexShrink: 0,
            }}>
              {initial}
            </div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.2, color: T.text1 }}>
                Hello, {firstName} 👋
              </div>
              <div style={{ fontSize: 11, color: T.text3, fontWeight: 500, marginTop: 2 }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
              </div>
            </div>
          </div>
          <div style={{
            fontSize: 10, fontWeight: 700, textTransform: "capitalize",
            letterSpacing: "0.04em", color: T.accentOnTint,
            background: T.accentTint,
            padding: "6px 12px", borderRadius: 10,
            boxShadow: SH.raisedSm,
          }}>
            {roleLabel}
          </div>
        </header>

        {/* ─── Stats Row ──────────────────────────────────────────── */}
        <div className="dash-stats-grid">
          {stats.map(stat => {
            const Icon = stat.Icon;
            return (
              <div key={stat.label} style={{
                borderRadius: 20, padding: "18px 10px",
                background: T.raised, boxShadow: SH.raised,
                display: "flex", flexDirection: "column",
                alignItems: "center", textAlign: "center",
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: stat.bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 10, color: stat.fg,
                  boxShadow: SH.raisedSm,
                }}>
                  <Icon size={17} strokeWidth={1.8} />
                </div>
                <div style={{
                  fontSize: 26, fontWeight: 900,
                  letterSpacing: "-0.04em", lineHeight: 1,
                  color: T.text1, marginBottom: 4,
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontSize: 9, fontWeight: 800,
                  textTransform: "uppercase", letterSpacing: "0.1em", color: T.text3,
                }}>
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── Main layout: hero + sidebar ─────────────────────────── */}
        <div className="dash-main-layout">

          {/* Left column: active tracker + nearby */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* ─── Active Issue / CTA Hero ─────────────────────────── */}
            <section>
              {activeIssue ? (
                <div style={{
                  borderRadius: 24, padding: 24,
                  background: T.raised, boxShadow: SH.raised,
                }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: 20,
                  }}>
                    <div>
                      <div style={{
                        fontSize: 10, fontWeight: 800, color: T.accent,
                        textTransform: "uppercase", letterSpacing: "0.1em",
                        marginBottom: 6, display: "flex", alignItems: "center", gap: 6,
                      }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: "50%", background: T.accent,
                          animation: "pulseGreen 2s ease-in-out infinite",
                        }} />
                        Active Tracker
                      </div>
                      <div style={{
                        fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em",
                        lineHeight: 1.25, color: T.text1, maxWidth: 240,
                      }}>
                        {activeIssue.title}
                      </div>
                    </div>
                    <StatusBadge status={activeIssue.status} />
                  </div>
                  <ProgressTracker status={activeIssue.status} />
                </div>
              ) : (
                <div style={{
                  borderRadius: 24, padding: "30px 26px",
                  background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
                  boxShadow: `8px 8px 20px rgba(29,158,117,0.28), -4px -4px 12px rgba(255,255,255,0.55)`,
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", bottom: -40, right: -40,
                    width: 180, height: 180, borderRadius: "50%",
                    background: "rgba(255,255,255,0.09)", pointerEvents: "none",
                  }} />
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{
                      fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em",
                      lineHeight: 1.2, marginBottom: 10, color: "#fff",
                    }}>
                      Your city<br />is in your hands.
                    </div>
                    <p style={{
                      fontSize: 13, color: "rgba(255,255,255,0.82)",
                      marginBottom: 22, maxWidth: 210, lineHeight: 1.55,
                    }}>
                      Report local issues to build a better neighborhood.
                    </p>
                    <button
                      onClick={() => router.push("/report")}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 7,
                        padding: "11px 22px", borderRadius: 14,
                        background: "#fff", color: T.accentDark,
                        fontSize: 13.5, fontWeight: 800, fontFamily: "inherit",
                        border: "none", cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                      }}
                    >
                      <Plus size={15} strokeWidth={2.5} />
                      Report Issue
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* ─── Nearby Problems ─────────────────────────────────── */}
            <section>
              <SectionHeader
                title="Nearby Problems"
                accent={T.accent}
                action="Open Map →"
                onAction={() => router.push("/map")}
              />
              {nearbyIssues.length === 0 ? (
                <div style={{
                  padding: "28px 20px", textAlign: "center",
                  background: T.raised, borderRadius: 18,
                  boxShadow: SH.insetSoft,
                }}>
                  <p style={{ fontSize: 13, color: T.text3, margin: 0 }}>
                    Everything looks quiet around here.
                  </p>
                </div>
              ) : (
                <div className="dash-issue-grid">
                  {nearbyIssues.map(item => (
                    <div
                      key={item.id}
                      onClick={() => router.push(`/issue?id=${item.id}`)}
                      style={{
                        display: "flex", alignItems: "center", gap: 14,
                        padding: "14px 16px", borderRadius: 18,
                        background: T.raised, boxShadow: SH.raised,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: T.accentTint,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: T.accent, flexShrink: 0,
                        boxShadow: SH.raisedSm,
                      }}>
                        <MapPin size={20} strokeWidth={1.8} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13.5, fontWeight: 700, color: T.text1,
                          marginBottom: 4,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {item.title}
                        </div>
                        <div style={{
                          fontSize: 11, fontWeight: 500, color: T.text3,
                          display: "flex", alignItems: "center", gap: 4,
                        }}>
                          <MapPin size={10} color={T.text3} />
                          {item.location_label?.split(",")[0] ?? "Near you"}
                        </div>
                      </div>
                      <div style={{
                        display: "flex", flexDirection: "column",
                        alignItems: "flex-end", gap: 8, flexShrink: 0,
                      }}>
                        <StatusBadge status={item.status} />
                        <ChevronRight size={14} color={T.text3} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right column: your history */}
          <section>
            <SectionHeader
              title="Your History"
              accent="#854F0B"
              action="View All"
              onAction={() => router.push("/my-reports")}
            />
            {recentIssues.length === 0 ? (
              <div style={{
                padding: "40px 20px", textAlign: "center",
                background: T.raised, borderRadius: 20,
                boxShadow: SH.inset,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: T.accentTint,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 14px", color: T.accent,
                  boxShadow: SH.raisedSm,
                }}>
                  <FileText size={22} strokeWidth={1.8} />
                </div>
                <p style={{ fontSize: 13, color: T.text3, margin: "0 0 16px" }}>
                  Help your city by reporting an issue!
                </p>
                <button
                  onClick={() => router.push("/report")}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "10px 20px", borderRadius: 12,
                    background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
                    color: "#fff", fontSize: 13, fontWeight: 700,
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                    boxShadow: SH.raisedSm,
                  }}
                >
                  <Plus size={14} />
                  Report now
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {recentIssues.map(issue => (
                  <div
                    key={issue.id}
                    onClick={() => router.push(`/issue?id=${issue.id}`)}
                    style={{
                      display: "flex", alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 16px", borderRadius: 18,
                      background: T.raised, boxShadow: SH.raised,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 12,
                        background: T.accentTint,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: T.accent, flexShrink: 0,
                        boxShadow: SH.raisedSm,
                      }}>
                        <FileText size={17} strokeWidth={1.8} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: 13.5, fontWeight: 700, color: T.text1,
                          marginBottom: 3,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {issue.title}
                        </div>
                        <div style={{
                          fontSize: 10, fontWeight: 600, color: T.text3,
                          textTransform: "uppercase", letterSpacing: "0.06em",
                        }}>
                          {new Date(issue.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
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

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulseGreen {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.55; transform: scale(0.82); }
        }
      ` }} />
    </div>
  );
}
