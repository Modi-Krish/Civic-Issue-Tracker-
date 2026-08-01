'use client';

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Clock, User, ArrowLeft, Info, CheckCircle2, Star, Camera, Check } from 'lucide-react';

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

const STATUS_STEPS = [
  { key: "REPORTED",              short: "Reported" },
  { key: "DEPARTMENT_ASSIGNED",   short: "Dept." },
  { key: "EMPLOYEE_ASSIGNED",     short: "Assigned" },
  { key: "IN_PROGRESS",           short: "In Progress" },
  { key: "SUBMITTED_FOR_APPROVAL",short: "Submitted" },
  { key: "APPROVED",              short: "Approved" },
  { key: "CLOSED",                short: "Closed" },
];

const TYPE_META: Record<string, { emoji: string, accent: string }> = {
  "Road Damage":       { emoji: "🚧", accent: "#f59e0b" },
  "Water Leakage":     { emoji: "💧", accent: "#60a5fa" },
  "Electricity Fault": { emoji: "⚡", accent: "#fbbf24" },
  "Sanitation":        { emoji: "🧹", accent: "#34d399" },
  "Streetlight":       { emoji: "💡", accent: "#FF2E11" },
  "Drainage":          { emoji: "🌊", accent: "#67e8f9" },
  "Other":             { emoji: "⚠️", accent: "#f87171" },
  default:             { emoji: "📋", accent: "#FF2E11" },
};


// ── StatusBadge ────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.REPORTED;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:c.bg, color:c.color, padding:"4px 11px", borderRadius:99, fontSize:11, fontWeight:700, letterSpacing:"0.05em", textTransform:"uppercase", border:`1px solid ${c.dot}35`, whiteSpace:"nowrap", flexShrink:0 }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:c.dot, boxShadow:`0 0 5px ${c.dot}` }} />
      {c.label}
    </span>
  );
}

// ── Progress Timeline ──────────────────────────────────────
function ProgressTimeline({ currentStatus, logs }: { currentStatus: string, logs: any[] }) {
  const currentIdx  = STATUS_STEPS.findIndex(s => s.key === currentStatus);

  return (
    <div style={{ overflowX:"auto", paddingBottom:4 }}>
      <div style={{ display:"flex", alignItems:"flex-start", minWidth:520, padding:"4px 0 8px" }}>
        {STATUS_STEPS.map((step, i) => {
          const done    = i <= currentIdx;
          const active  = step.key === currentStatus;
          const log     = logs.find(l => l.to_status === step.key);
          const c       = STATUS_CONFIG[step.key as keyof typeof STATUS_CONFIG];

          return (
            <div key={step.key} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", position:"relative" }}>
              {/* connector line */}
              {i > 0 && (
                <div style={{
                  position:"absolute", top:14, right:"50%", width:"100%", height:2,
                  background: done ? `linear-gradient(90deg, ${c?.dot}80, ${c?.dot}30)` : "rgba(255,255,255,0.07)",
                  zIndex:0,
                }} />
              )}

              {/* dot */}
              <div style={{
                position:"relative", zIndex:1,
                width:28, height:28, borderRadius:10,
                background: active ? `linear-gradient(135deg, ${c?.dot}, ${c?.dot}aa)` : done ? `${c?.dot}22` : "rgba(255,255,255,0.05)",
                border: `1.5px solid ${done ? c?.dot + "60" : "rgba(255,255,255,0.1)"}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow: active ? `0 0 12px ${c?.dot}55` : "none",
                marginBottom:8, flexShrink:0,
              }}>
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6l2.5 2.5L9.5 4" stroke={active ? "white" : c?.dot} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <div style={{ width:6, height:6, borderRadius:"50%", background:"rgba(255,255,255,0.2)" }} />
                )}
              </div>

              {/* label */}
              <span style={{ fontSize:9, fontWeight:done?700:500, color:active?"#fff":done?c?.color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.07em", textAlign:"center", lineHeight:1.3 }}>
                {step.short}
              </span>

              {/* date */}
              {log && (
                <span style={{ fontSize:8, color:"rgba(255,255,255,0.25)", marginTop:3, textAlign:"center" }}>
                  {new Date(log.created_at).toLocaleDateString("en-US",{ month:"short", day:"numeric" })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import Image from 'next/image';

// ── Photo UI ──────────────────────────────────────
function PhotoCard({ label, accent, icon, url }: { label: string, accent: string, icon: React.ReactNode, url: string | null }) {
  const [error, setError] = useState(false);

  return (
    <div style={{ borderRadius:16, overflow:"hidden", border:`0.5px solid ${accent}25`, background:`${accent}08` }}>
      <div style={{ padding:"10px 14px 8px", borderBottom:`0.5px solid ${accent}15`, display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:10, fontWeight:800, color:accent, textTransform:"uppercase", letterSpacing:"0.1em" }}>{label}</span>
        <div style={{ flex:1, height:1, background:`${accent}20` }} />
      </div>
      <div style={{ minHeight:180, position: "relative" }}>
        {url && !error ? (
          <Image 
            src={url} 
            alt={label} 
            fill 
            unoptimized 
            style={{ objectFit: "cover", display: "block" }} 
            sizes="(max-width: 768px) 100vw, 33vw" 
            onError={() => setError(true)}
          />
        ) : (
          <div style={{ height:180, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, background:`${accent}05` }}>
            <div style={{ fontSize:32, opacity:0.4 }}>{icon}</div>
            <span style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.25)", letterSpacing:"0.05em" }}>No photo</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Detail row ─────────────────────────────────────────────
function DetailRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 0", borderBottom:"0.5px solid rgba(255,255,255,0.05)" }}>
      <div style={{ width:32, height:32, borderRadius:9, background:"rgba(255,255,255,0.04)", border:"0.5px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        {icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>{label}</div>
        <div style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.75)", lineHeight:1.4 }}>{value}</div>
      </div>
    </div>
  );
}

// ── Activity log item ──────────────────────────────────────
function LogItem({ log, isLast }: { log: any, isLast: boolean }) {
  const c = STATUS_CONFIG[log.to_status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.REPORTED;
  const date = new Date(log.created_at);
  return (
    <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
      {/* vertical line + dot */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
        <div style={{ width:10, height:10, borderRadius:"50%", background:c.dot, border:`2px solid ${c.dot}40`, boxShadow:`0 0 8px ${c.dot}55`, marginTop:2, flexShrink:0 }} />
        {!isLast && <div style={{ width:1.5, flex:1, background:"rgba(255,255,255,0.07)", marginTop:4, minHeight:28 }} />}
      </div>

      <div style={{ flex:1, paddingBottom: isLast ? 0 : 20 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:4 }}>
          <StatusBadge status={log.to_status} />
          <span style={{ fontSize:10, color:"rgba(255,255,255,0.28)", fontWeight:500, whiteSpace:"nowrap" }}>
            {date.toLocaleDateString("en-US",{ month:"short", day:"numeric" })} · {date.toLocaleTimeString("en-US",{ hour:"2-digit", minute:"2-digit" })}
          </span>
        </div>
        {log.comment && (
          <p style={{ fontSize:12, color:"rgba(255,255,255,0.45)", lineHeight:1.55, margin:0 }}>{log.comment}</p>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────
function IssueDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');
  
  const [issue, setIssue] = useState<any | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [reporter, setReporter] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Rating state
  const [citizenRating, setCitizenRating] = useState<number>(5);
  const [citizenComment, setCitizenComment] = useState<string>('');
  const [submittingRating, setSubmittingRating] = useState<boolean>(false);
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);

  const handleSubmitRating = async () => {
    if (!id || !issue) return;
    setSubmittingRating(true);

    try {
      const { doc, updateDoc, serverTimestamp, addDoc, collection } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');

      const isReworkRequired = citizenRating < 2.5;
      const nextStatus = isReworkRequired ? 'COMPANY_ASSIGNED' : 'CLOSED';
      const commentText = isReworkRequired 
        ? `Citizen gave rating ${citizenRating}/5.0 (< 2.5 threshold). Sent back to Company for repair again!`
        : `Citizen approved repair quality with rating ${citizenRating}/5.0. Issue resolved and closed.`;

      // 1. Update Firestore issue
      await updateDoc(doc(db, 'issues', id), {
        status: nextStatus,
        rating: citizenRating,
        citizen_feedback: citizenComment || null,
        updated_at: serverTimestamp()
      });

      // 2. Add log entry
      await addDoc(collection(db, 'issue_status_logs'), {
        issue_id: id,
        to_status: nextStatus,
        changed_by: issue.reporter_id || 'CITIZEN',
        comment: commentText,
        created_at: serverTimestamp()
      });

      setIssue((prev: any) => ({
        ...prev,
        status: nextStatus,
        rating: citizenRating,
        citizen_feedback: citizenComment
      }));

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
        const { collection, getDocs, doc, getDoc, query, where, orderBy } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');

        // 1. Issue
        const issueRef = doc(db, 'issues', id!);
        const issueSnap = await getDoc(issueRef);
        
        if (!issueSnap.exists()) {
          setLoading(false);
          return;
        }
        const issueData = { id: issueSnap.id, ...issueSnap.data() } as any;
        
        // 2. Logs
        const qLogs = query(collection(db, 'issue_status_logs'), where('issue_id', '==', id!), orderBy('created_at', 'asc'));
        const logsSnap = await getDocs(qLogs);
        const logsData = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 3. Reporter
        let reporterData = null;
        if (issueData.reporter_id) {
          const reporterRef = doc(db, 'profiles', issueData.reporter_id);
          const reporterSnap = await getDoc(reporterRef);
          if (reporterSnap.exists()) {
            reporterData = reporterSnap.data();
          }
        }
        
        setIssue(issueData);
        setLogs(logsData);
        setReporter(reporterData);
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
      <div style={{ minHeight: "100vh", background: "#0d0d0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(255, 46, 17, 0.1)", borderTopColor: "#FF2E11", animation: "spin 1s linear infinite" }} />
        
      </div>
    );
  }

  if (!issue) return <div style={{ color: "white", padding: 40 }}>Issue not found</div>;

  const meta  = TYPE_META[issue.issue_type] || TYPE_META.default;
  const shortId = issue.id.slice(0,8).toUpperCase();
  const resolveImg = (imgObj: any, path: string | null | undefined) => {
    if (imgObj?.url) return imgObj.url;
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
    const sUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oyeogxnvdckmazhwiksm.supabase.co';
    return `${sUrl}/storage/v1/object/public/issue-images/${path}`;
  };

  const beforeUrl = resolveImg(issue.image, issue.before_image_path);
  const afterUrl = resolveImg(issue.after_image, issue.after_image_path);

  return (
    <div style={{ minHeight:"100vh", background:"#0d0d0f", fontFamily:"'Inter',-apple-system,sans-serif", color:"#fff" }}>

      {/* ambient */}
      <div style={{ position:"fixed", inset:0, pointerEvents: "none", overflow:"hidden", zIndex:0 }}>
        <div style={{ position:"absolute", top:-80, left:"25%", width:400, height:280, background: "radial-gradient(ellipse, rgba(255, 46, 17, 0.1) 0%, transparent 70%)", borderRadius:"50%" }} />
      </div>

      {/* ── STICKY TOP BAR ── */}
      <div style={{ position:"sticky", top:0, zIndex:50, background:"rgba(13,13,15,0.94)", backdropFilter:"blur(20px)", borderBottom:"0.5px solid rgba(255,255,255,0.07)" }}>
        <div style={{ maxWidth:560, margin:"0 auto", padding:"12px 16px", display:"flex", alignItems:"center", gap:10 }}>
          {/* back */}
          <button onClick={() => router.back()} style={{ width:34, height:34, borderRadius:10, border:"0.5px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.04)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
            <ArrowLeft style={{ width: 16, height: 16, color: "rgba(255,255,255,0.7)" }} />
          </button>

          {/* title */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:800, letterSpacing:"-0.02em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{issue.title}</div>
            <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.3)", letterSpacing:"0.06em" }}>#{shortId}</div>
          </div>

          <StatusBadge status={issue.status} />
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ position:"relative", zIndex:1, maxWidth:560, margin:"0 auto", padding:"16px 16px 100px" }}>

        {/* TYPE HERO CHIP */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, padding:"12px 14px", borderRadius:16, background:`${meta.accent}10`, border:`0.5px solid ${meta.accent}25` }}>
          <span style={{ fontSize:26 }}>{meta.emoji}</span>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:meta.accent, textTransform:"uppercase", letterSpacing:"0.07em" }}>{issue.issue_type}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", fontWeight:500 }}>Reported {new Date(issue.created_at?.toDate ? issue.created_at.toDate() : issue.created_at).toLocaleDateString("en-US",{day:"numeric",month:"long",year:"numeric"})}</div>
          </div>
          <div style={{ flex:1 }} />
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", fontWeight:600, background:"rgba(255,255,255,0.04)", padding:"4px 10px", borderRadius:8, border:"0.5px solid rgba(255,255,255,0.08)" }}>
            by {reporter?.full_name || 'Citizen'}
          </div>
        </div>

        {/* ── PROGRESS SECTION ── */}
        <div style={{ borderRadius:20, border:"0.5px solid rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.025)", padding:"16px 16px 12px", marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:14, display:"flex", alignItems:"center", gap:6 }}>
            <Star style={{ width: 12, height: 12, color: "#FF2E11", fill: "#FF2E11" }} />
            Live Progress
          </div>
          <ProgressTimeline currentStatus={issue.status} logs={logs} />
        </div>

        {/* ── PHOTOS ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          <PhotoCard label="Reported Photo" accent="#60a5fa" icon={<Camera />} url={beforeUrl} />
          <PhotoCard label="Updated Photo"    accent="#34d399" icon={<CheckCircle2 />} url={afterUrl} />
        </div>

        {/* ── CITIZEN RATING SECTION (IF IN COMMUNITY_REVIEW OR RATED) ── */}
        {(issue.status === 'COMMUNITY_REVIEW' || issue.rating) && (
          <div style={{ borderRadius:20, border: issue.status === 'COMMUNITY_REVIEW' ? "1.5px solid #f59e0b" : "0.5px solid rgba(255,255,255,0.07)", background: issue.status === 'COMMUNITY_REVIEW' ? "rgba(245, 158, 11, 0.05)" : "rgba(255,255,255,0.025)", padding:18, marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:800, color: "#f59e0b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
              <Star style={{ width: 16, height: 16, fill: "#f59e0b" }} />
              {issue.status === 'COMMUNITY_REVIEW' ? "Rate & Review Repair Quality" : "Citizen Rating & Review"}
            </div>

            {issue.status === 'COMMUNITY_REVIEW' && !ratingSubmitted ? (
              <div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", margin: "0 0 12px" }}>
                  Please rate the quality of the repair work done by the contractor.
                  <strong style={{ color: "#ef4444", display: "block", marginTop: 4 }}>Note: Ratings below 2.5/5.0 will automatically send the work back for repair again.</strong>
                </p>

                {/* Star Selector */}
                <div style={{ display: "flex", gap: 12, marginBottom: 16, justifyContent: "center" }}>
                  {[1, 2, 3, 4, 5].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCitizenRating(num)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: citizenRating >= num ? "#f59e0b" : "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: citizenRating >= num ? "black" : "rgba(255,255,255,0.4)",
                        fontSize: 18,
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                      {num}★
                    </button>
                  ))}
                </div>

                <textarea
                  value={citizenComment}
                  onChange={(e) => setCitizenComment(e.target.value)}
                  placeholder="Optional comments (e.g. Work quality feedback)..."
                  rows={2}
                  style={{ width: "100%", padding: 12, borderRadius: 12, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
                />

                <button
                  type="button"
                  onClick={handleSubmitRating}
                  disabled={submittingRating}
                  style={{
                    width: "100%",
                    padding: 14,
                    borderRadius: 12,
                    background: citizenRating < 2.5 ? "#ef4444" : "#10b981",
                    color: "white",
                    fontSize: 14,
                    fontWeight: 800,
                    border: "none",
                    cursor: submittingRating ? "not-allowed" : "pointer"
                  }}>
                  {submittingRating ? "Submitting..." : (citizenRating < 2.5 ? "Submit Rating (Send Back for Rework)" : "Approve & Mark Resolved")}
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: (issue.rating || citizenRating) < 2.5 ? "#ef4444" : "#10b981", marginBottom: 4 }}>
                  {issue.rating || citizenRating} / 5.0 ⭐
                </div>
                {issue.citizen_feedback && (
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontStyle: "italic", margin: 0 }}>
                    "{issue.citizen_feedback}"
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── DETAILS ── */}
        <div style={{ borderRadius:20, border:"0.5px solid rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.025)", padding:"16px", marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>Details</div>

          <p style={{ fontSize:13, color:"rgba(255,255,255,0.5)", lineHeight:1.65, margin:"0 0 14px 0", borderBottom:"0.5px solid rgba(255,255,255,0.06)", paddingBottom:14 }}>
            {issue.description}
          </p>

          <DetailRow icon={<MapPin style={{width: 16, height: 16, color: "#FF2E11"}}/>} label="Location"     value={issue.location_label || `${issue.location_lat}, ${issue.location_lng}`} />
          <DetailRow icon={<Clock style={{width: 16, height: 16, color: "rgba(255,255,255,0.5)"}}/>} label="Reported on"  value={new Date(issue.created_at?.toDate ? issue.created_at.toDate() : issue.created_at).toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})} />
          <DetailRow icon={<User style={{width: 16, height: 16, color: "rgba(255,255,255,0.5)"}}/>} label="Reported by"  value={reporter?.full_name || 'Citizen'} />
          <div style={{ paddingTop:10, display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:`${meta.accent}15`, border:`0.5px solid ${meta.accent}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>{meta.emoji}</div>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>Issue Type</div>
              <div style={{ fontSize:13, fontWeight:700, color:meta.accent }}>{issue.issue_type}</div>
            </div>
          </div>
        </div>

        {/* ── ACTIVITY LOG ── */}
        <div style={{ borderRadius:20, border:"0.5px solid rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.025)", padding:"16px" }}>
          <div style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:18, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span>Activity Log</span>
            <span style={{ fontSize:10, background:"rgba(255,255,255,0.06)", padding:"2px 8px", borderRadius:99, color:"rgba(255,255,255,0.3)", fontWeight:700 }}>{logs.length} events</span>
          </div>

          {[...logs].length === 0 ? (
            <div style={{ textAlign:"center", padding:"28px 0", color:"rgba(255,255,255,0.25)", fontSize:13 }}>No activity yet.</div>
          ) : (
            <div>
              {[...logs].reverse().map((log, i) => (
                <LogItem key={log.id} log={log} isLast={i === logs.length - 1} />
              ))}
            </div>
          )}
        </div>
      </div>

      
    </div>
  );
}

export default function IssueDetailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0d0d0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(255, 46, 17, 0.1)", borderTopColor: "#FF2E11", animation: "spin 1s linear infinite" }} />
        
      </div>
    }>
      <IssueDetailContent />
    </Suspense>
  );
}
