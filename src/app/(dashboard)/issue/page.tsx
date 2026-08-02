'use client';

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { MapPin, Clock, User, ArrowLeft, Star, Camera, CheckCircle2, Check } from 'lucide-react';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  base:       "#EDEBE4",
  raised:     "#F5F3EC",
  border:     "#DDD9CE",
  text1:      "#2C2C2A",
  text2:      "#5F5E5A",
  text3:      "#888780",
  accent:     "#1D9E75",
  accentDark: "#167A5B",
  accentTint: "#E1F5EE",
  shL: "rgba(255,255,255,0.75)",
  shD: "rgba(0,0,0,0.09)",
} as const;

const SH = {
  raised:   `8px 8px 16px ${T.shD}, -8px -8px 16px ${T.shL}`,
  raisedSm: `4px 4px 8px ${T.shD}, -4px -4px 8px ${T.shL}`,
  inset:    `inset 5px 5px 10px ${T.shD}, inset -5px -5px 10px ${T.shL}`,
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  REPORTED:               { label: "Reported",         bg: "#E6F1FB", fg: "#0C447C", dot: "#0C447C" },
  DEPARTMENT_ASSIGNED:    { label: "Dept. Assigned",   bg: "#EEEDFE", fg: "#3C3489", dot: "#3C3489" },
  EMPLOYEE_ASSIGNED:      { label: "Emp. Assigned",    bg: "#EEEDFE", fg: "#3C3489", dot: "#3C3489" },
  IN_PROGRESS:            { label: "In Progress",      bg: "#EAF3DE", fg: "#27500A", dot: "#27500A" },
  SUBMITTED_FOR_APPROVAL: { label: "Pending Approval", bg: "#FAEEDA", fg: "#854F0B", dot: "#854F0B" },
  APPROVED:               { label: "Approved",          bg: "#E1F5EE", fg: "#085041", dot: T.accent },
  REJECTED:               { label: "Rejected",          bg: "#FCEBEB", fg: "#791F1F", dot: "#791F1F" },
  CLOSED:                 { label: "Closed",            bg: "#F0EEE8", fg: "#888780", dot: "#888780" },
};

const STATUS_STEPS = [
  { key: "REPORTED",               short: "Reported" },
  { key: "DEPARTMENT_ASSIGNED",    short: "Dept." },
  { key: "EMPLOYEE_ASSIGNED",      short: "Assigned" },
  { key: "IN_PROGRESS",            short: "In Progress" },
  { key: "SUBMITTED_FOR_APPROVAL", short: "Submitted" },
  { key: "APPROVED",               short: "Approved" },
  { key: "CLOSED",                 short: "Closed" },
];

const TYPE_META: Record<string, { emoji: string; bg: string; fg: string }> = {
  "Road Damage":       { emoji: "🚧", bg: "#E6F1FB", fg: "#0C447C" },
  "Water Leakage":     { emoji: "💧", bg: "#EAF3DE", fg: "#27500A" },
  "Electricity Fault": { emoji: "⚡", bg: "#FAEEDA", fg: "#854F0B" },
  "Sanitation":        { emoji: "🧹", bg: "#FAECE7", fg: "#712B13" },
  "Streetlight":       { emoji: "💡", bg: "#FAEEDA", fg: "#854F0B" },
  "Drainage":          { emoji: "🌊", bg: "#EAF3DE", fg: "#27500A" },
  "Other":             { emoji: "⚠️", bg: "#EEEDFE", fg: "#3C3489" },
  default:             { emoji: "📋", bg: "#EEEDFE", fg: "#3C3489" },
};

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.REPORTED;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: c.bg, color: c.fg,
      padding: "4px 11px", borderRadius: 99,
      fontSize: 11, fontWeight: 700,
      letterSpacing: "0.05em", textTransform: "uppercase",
      whiteSpace: "nowrap", flexShrink: 0,
      boxShadow: SH.raisedSm,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />
      {c.label}
    </span>
  );
}

// ── Progress Timeline ─────────────────────────────────────────────────────────
function ProgressTimeline({ currentStatus, logs }: { currentStatus: string; logs: any[] }) {
  const currentIdx = STATUS_STEPS.findIndex(s => s.key === currentStatus);

  return (
    <div style={{ overflowX: "auto", paddingBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "flex-start", minWidth: 520, padding: "4px 0 8px" }}>
        {STATUS_STEPS.map((step, i) => {
          const done   = i <= currentIdx;
          const active = step.key === currentStatus;
          const log    = logs.find(l => l.to_status === step.key);
          const c      = STATUS_CONFIG[step.key as keyof typeof STATUS_CONFIG];

          return (
            <div key={step.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
              {/* connector */}
              {i > 0 && (
                <div style={{
                  position: "absolute", top: 14, right: "50%", width: "100%", height: 2,
                  background: done ? `linear-gradient(90deg, ${c?.dot}80, ${c?.dot}30)` : T.border,
                  zIndex: 0,
                }} />
              )}
              {/* dot */}
              <div style={{
                position: "relative", zIndex: 1,
                width: 28, height: 28, borderRadius: 10,
                background: active ? c?.bg : done ? c?.bg : T.raised,
                border: `1.5px solid ${done ? c?.dot + "80" : T.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: active ? `${SH.inset}, 0 0 0 3px ${c?.dot}30` : SH.raisedSm,
                marginBottom: 8, flexShrink: 0,
              }}>
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6l2.5 2.5L9.5 4" stroke={c?.dot} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.border }} />
                )}
              </div>
              {/* label */}
              <span style={{
                fontSize: 9, fontWeight: done ? 700 : 500,
                color: active ? c?.fg : done ? c?.fg : T.text3,
                textTransform: "uppercase", letterSpacing: "0.07em",
                textAlign: "center", lineHeight: 1.3,
              }}>
                {step.short}
              </span>
              {/* date */}
              {log && (
                <span style={{ fontSize: 8, color: T.text3, marginTop: 3, textAlign: "center" }}>
                  {new Date(log.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Photo Card ────────────────────────────────────────────────────────────────
function PhotoCard({ label, bg, fg, icon, url }: { label: string; bg: string; fg: string; icon: React.ReactNode; url: string | null }) {
  const [error, setError] = useState(false);
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", background: T.raised, boxShadow: SH.raisedSm }}>
      <div style={{
        padding: "8px 12px 6px", background: bg,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: fg, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      </div>
      <div style={{ minHeight: 160, position: "relative" }}>
        {url && !error ? (
          <Image src={url} alt={label} fill unoptimized style={{ objectFit: "cover" }} sizes="50vw" onError={() => setError(true)} />
        ) : (
          <div style={{ height: 160, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div style={{ fontSize: 28, opacity: 0.35 }}>{icon}</div>
            <span style={{ fontSize: 10, fontWeight: 600, color: T.text3 }}>No photo</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Detail Row ────────────────────────────────────────────────────────────────
function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: T.raised, boxShadow: SH.raisedSm,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text2, lineHeight: 1.4 }}>{value}</div>
      </div>
    </div>
  );
}

// ── Log Item ──────────────────────────────────────────────────────────────────
function LogItem({ log, isLast }: { log: any; isLast: boolean }) {
  const c = STATUS_CONFIG[log.to_status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.REPORTED;
  const date = new Date(log.created_at);
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: c.dot, border: `2px solid ${c.bg}`,
          boxShadow: `0 0 6px ${c.dot}55`, marginTop: 2, flexShrink: 0,
        }} />
        {!isLast && <div style={{ width: 1.5, flex: 1, background: T.border, marginTop: 4, minHeight: 28 }} />}
      </div>
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
          <StatusBadge status={log.to_status} />
          <span style={{ fontSize: 10, color: T.text3, fontWeight: 500, whiteSpace: "nowrap" }}>
            {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        {log.comment && (
          <p style={{ fontSize: 12, color: T.text2, lineHeight: 1.55, margin: 0 }}>{log.comment}</p>
        )}
      </div>
    </div>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────
function SCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      borderRadius: 20, background: T.raised, boxShadow: SH.raised,
      padding: "16px", marginBottom: 12, ...style,
    }}>
      {children}
    </div>
  );
}

function SecLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 800, color: T.text3,
      textTransform: "uppercase", letterSpacing: "0.1em",
      marginBottom: 12, display: "flex", alignItems: "center", gap: 6,
    }}>
      {icon}{children}
    </div>
  );
}

// ── Main page component ───────────────────────────────────────────────────────
function IssueDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const [issue, setIssue] = useState<any | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [reporter, setReporter] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [citizenRating, setCitizenRating] = useState<number>(5);
  const [citizenComment, setCitizenComment] = useState<string>("");
  const [submittingRating, setSubmittingRating] = useState<boolean>(false);
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);

  const handleSubmitRating = async () => {
    if (!id || !issue) return;
    setSubmittingRating(true);
    try {
      const { doc, updateDoc, serverTimestamp, addDoc, collection } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      const isReworkRequired = citizenRating < 2.5;
      const nextStatus = isReworkRequired ? "COMPANY_ASSIGNED" : "CLOSED";
      const commentText = isReworkRequired
        ? `Citizen gave rating ${citizenRating}/5.0 (< 2.5 threshold). Sent back to Company for repair again!`
        : `Citizen approved repair quality with rating ${citizenRating}/5.0. Issue resolved and closed.`;
      await updateDoc(doc(db, "issues", id), { status: nextStatus, rating: citizenRating, citizen_feedback: citizenComment || null, updated_at: serverTimestamp() });
      await addDoc(collection(db, "issue_status_logs"), { issue_id: id, to_status: nextStatus, changed_by: issue.reporter_id || "CITIZEN", comment: commentText, created_at: serverTimestamp() });
      setIssue((prev: any) => ({ ...prev, status: nextStatus, rating: citizenRating, citizen_feedback: citizenComment }));
      setRatingSubmitted(true);
    } catch (err: any) {
      alert("Failed to submit rating: " + err.message);
    } finally {
      setSubmittingRating(false);
    }
  };

  useEffect(() => {
    async function fetchAll() {
      try {
        const { collection, getDocs, doc, getDoc, query, where, orderBy } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        const issueRef = doc(db, "issues", id!);
        const issueSnap = await getDoc(issueRef);
        if (!issueSnap.exists()) { setLoading(false); return; }
        const issueData = { id: issueSnap.id, ...issueSnap.data() } as any;
        const qLogs = query(collection(db, "issue_status_logs"), where("issue_id", "==", id!), orderBy("created_at", "asc"));
        const logsSnap = await getDocs(qLogs);
        const logsData = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        let reporterData = null;
        if (issueData.reporter_id) {
          const reporterRef = doc(db, "profiles", issueData.reporter_id);
          const reporterSnap = await getDoc(reporterRef);
          if (reporterSnap.exists()) reporterData = reporterSnap.data();
        }
        setIssue(issueData); setLogs(logsData); setReporter(reporterData);
      } catch (error) {
        console.error("Error fetching issue:", error);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchAll();
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", background: T.base, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${T.border}`, borderTopColor: T.accent, animation: "spin 1s linear infinite" }} />
        <style dangerouslySetInnerHTML={{ __html: "@keyframes spin { to { transform: rotate(360deg); } }" }} />
      </div>
    );
  }

  if (!issue) return <div style={{ color: T.text1, padding: 40 }}>Issue not found.</div>;

  const meta = TYPE_META[issue.issue_type] ?? TYPE_META.default;
  const shortId = issue.id.slice(0, 8).toUpperCase();

  const resolveImg = (imgObj: any, path: string | null | undefined) => {
    if (imgObj?.url) return imgObj.url;
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path;
    const sUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://oyeogxnvdckmazhwiksm.supabase.co";
    return `${sUrl}/storage/v1/object/public/issue-images/${path}`;
  };

  const beforeUrl = resolveImg(issue.image, issue.before_image_path);
  const afterUrl  = resolveImg(issue.after_image, issue.after_image_path);

  return (
    <div style={{ minHeight: "100dvh", background: T.base, fontFamily: "'Inter',-apple-system,sans-serif", color: T.text1 }}>

      {/* ── Sticky top bar ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: T.raised, borderBottom: `1px solid ${T.border}`,
        boxShadow: `0 4px 16px ${T.shD}`,
      }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => router.back()} style={{
            width: 36, height: 36, borderRadius: 12,
            border: `1px solid ${T.border}`, background: T.raised,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0, boxShadow: SH.raisedSm,
          }}>
            <ArrowLeft size={16} color={T.text2} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: T.text1 }}>
              {issue.title}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, letterSpacing: "0.06em" }}>#{shortId}</div>
          </div>
          <StatusBadge status={issue.status} />
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ position: "relative", maxWidth: 560, margin: "0 auto", padding: "16px 16px 100px" }}>

        {/* Type hero chip */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
          padding: "12px 14px", borderRadius: 18,
          background: meta.bg, boxShadow: SH.raisedSm,
        }}>
          <span style={{ fontSize: 26 }}>{meta.emoji}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: meta.fg, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              {issue.issue_type}
            </div>
            <div style={{ fontSize: 11, color: T.text3, fontWeight: 500 }}>
              Reported {new Date(issue.created_at?.toDate ? issue.created_at.toDate() : issue.created_at).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{
            fontSize: 11, color: T.text3, fontWeight: 600,
            background: T.raised, padding: "4px 10px", borderRadius: 8,
            boxShadow: SH.raisedSm,
          }}>
            by {reporter?.full_name ?? "Citizen"}
          </div>
        </div>

        {/* Progress */}
        <SCard>
          <SecLabel icon={<Star size={12} color={T.accent} fill={T.accent} />}>Live Progress</SecLabel>
          <ProgressTimeline currentStatus={issue.status} logs={logs} />
        </SCard>

        {/* Photos */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <PhotoCard label="Reported Photo" bg="#E6F1FB" fg="#0C447C" icon={<Camera />} url={beforeUrl} />
          <PhotoCard label="Updated Photo"  bg="#E1F5EE" fg="#085041" icon={<CheckCircle2 />} url={afterUrl} />
        </div>

        {/* Citizen Rating */}
        {(issue.status === "COMMUNITY_REVIEW" || issue.rating) && (
          <SCard style={{ border: issue.status === "COMMUNITY_REVIEW" ? `2px solid #854F0B55` : undefined, background: issue.status === "COMMUNITY_REVIEW" ? "#FAEEDA" : T.raised }}>
            <SecLabel icon={<Star size={14} color="#854F0B" fill="#854F0B" />}>
              {issue.status === "COMMUNITY_REVIEW" ? "Rate & Review Repair Quality" : "Citizen Rating & Review"}
            </SecLabel>

            {issue.status === "COMMUNITY_REVIEW" && !ratingSubmitted ? (
              <div>
                <p style={{ fontSize: 13, color: T.text2, margin: "0 0 12px" }}>
                  Please rate the quality of the repair work done by the contractor.
                  <strong style={{ color: "#791F1F", display: "block", marginTop: 4 }}>
                    Note: Ratings below 2.5/5.0 will send the work back for repair.
                  </strong>
                </p>
                <div style={{ display: "flex", gap: 10, marginBottom: 14, justifyContent: "center" }}>
                  {[1, 2, 3, 4, 5].map(num => (
                    <button key={num} type="button" onClick={() => setCitizenRating(num)} style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: citizenRating >= num ? "#FAEEDA" : T.raised,
                      border: citizenRating >= num ? "2px solid #854F0B55" : `1px solid ${T.border}`,
                      color: citizenRating >= num ? "#854F0B" : T.text3,
                      fontSize: 16, fontWeight: 800, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: citizenRating >= num ? SH.inset : SH.raisedSm,
                      fontFamily: "inherit",
                    }}>
                      {num}★
                    </button>
                  ))}
                </div>
                <textarea value={citizenComment} onChange={e => setCitizenComment(e.target.value)}
                  placeholder="Optional comments..." rows={2}
                  style={{
                    width: "100%", padding: 12, borderRadius: 12,
                    background: T.raised, border: `1px solid ${T.border}`,
                    boxShadow: SH.inset,
                    color: T.text1, fontSize: 13, outline: "none",
                    boxSizing: "border-box", marginBottom: 12, fontFamily: "inherit",
                  }}
                />
                <button type="button" onClick={handleSubmitRating} disabled={submittingRating} style={{
                  width: "100%", padding: 14, borderRadius: 14,
                  background: citizenRating < 2.5 ? "#FCEBEB" : T.accentTint,
                  color: citizenRating < 2.5 ? "#791F1F" : "#085041",
                  fontSize: 14, fontWeight: 800, border: "none", cursor: submittingRating ? "not-allowed" : "pointer",
                  boxShadow: SH.raisedSm, fontFamily: "inherit",
                }}>
                  {submittingRating ? "Submitting…" : (citizenRating < 2.5 ? "Submit Rating (Send Back for Rework)" : "Approve & Mark Resolved")}
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: (issue.rating ?? citizenRating) < 2.5 ? "#791F1F" : T.accentDark, marginBottom: 4 }}>
                  {issue.rating ?? citizenRating} / 5.0 ⭐
                </div>
                {issue.citizen_feedback && (
                  <p style={{ fontSize: 13, color: T.text2, fontStyle: "italic", margin: 0 }}>
                    "{issue.citizen_feedback}"
                  </p>
                )}
              </div>
            )}
          </SCard>
        )}

        {/* Details */}
        <SCard>
          <SecLabel>Details</SecLabel>
          <p style={{ fontSize: 13, color: T.text2, lineHeight: 1.65, margin: "0 0 12px 0", borderBottom: `1px solid ${T.border}`, paddingBottom: 12 }}>
            {issue.description}
          </p>
          <DetailRow icon={<MapPin size={16} color={T.accent} />} label="Location" value={issue.location_label ?? `${issue.location_lat}, ${issue.location_lng}`} />
          <DetailRow icon={<Clock size={16} color={T.text3} />} label="Reported on" value={new Date(issue.created_at?.toDate ? issue.created_at.toDate() : issue.created_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} />
          <DetailRow icon={<User size={16} color={T.text3} />} label="Reported by" value={reporter?.full_name ?? "Citizen"} />
          <div style={{ paddingTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, boxShadow: SH.raisedSm }}>
              {meta.emoji}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Issue Type</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: meta.fg }}>{issue.issue_type}</div>
            </div>
          </div>
        </SCard>

        {/* Activity Log */}
        <SCard>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <SecLabel>Activity Log</SecLabel>
            <span style={{
              fontSize: 10, background: T.raised, boxShadow: SH.raisedSm,
              padding: "2px 8px", borderRadius: 99, color: T.text3, fontWeight: 700,
            }}>
              {logs.length} events
            </span>
          </div>
          {logs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 0", color: T.text3, fontSize: 13 }}>No activity yet.</div>
          ) : (
            <div>
              {[...logs].reverse().map((log, i) => (
                <LogItem key={log.id} log={log} isLast={i === logs.length - 1} />
              ))}
            </div>
          )}
        </SCard>
      </div>
    </div>
  );
}

export default function IssueDetailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100dvh", background: "#EDEBE4", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #DDD9CE", borderTopColor: "#1D9E75", animation: "spin 1s linear infinite" }} />
        <style dangerouslySetInnerHTML={{ __html: "@keyframes spin { to { transform: rotate(360deg); } }" }} />
      </div>
    }>
      <IssueDetailContent />
    </Suspense>
  );
}
