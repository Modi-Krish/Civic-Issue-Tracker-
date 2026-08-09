'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, MapPin, Clock, ChevronRight, Filter, Share2, Trash2, ShieldAlert } from "lucide-react";
import { useAuth } from '@/lib/supabase/auth-context';

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

const NEW_STATUS_COLORS = {
  REPORTED: { label: "Reported", bg: "#E5E7EB", fg: "#4B5563", dot: "#6B7280" }, // Gray
  VERIFIED: { label: "Verified", bg: "#DBEAFE", fg: "#1D4ED8", dot: "#2563EB" },
  ASSIGNED: { label: "Assigned", bg: "#DBEAFE", fg: "#1D4ED8", dot: "#2563EB" }, // Blue
  IN_PROGRESS: { label: "In Progress", bg: "#FFEDD5", fg: "#C2410C", dot: "#EA580C" }, // Orange
  COMPLETED: { label: "Completed", bg: "#DCFCE7", fg: "#15803D", dot: "#16A34A" }, // Green
  COMMUNITY_REVIEW: { label: "Community Review", bg: "#F3E8FF", fg: "#7E22CE", dot: "#9333EA" }, // Purple
  CLOSED: { label: "Closed", bg: "#F0EEE8", fg: "#888780", dot: "#888780" },
  REJECTED: { label: "Rejected", bg: "#FEE2E2", fg: "#B91C1C", dot: "#DC2626" }, // Red
  
  // Mappings for older statuses
  DEPARTMENT_ASSIGNED: { label: "Assigned", bg: "#DBEAFE", fg: "#1D4ED8", dot: "#2563EB" },
  EMPLOYEE_ASSIGNED: { label: "Assigned", bg: "#DBEAFE", fg: "#1D4ED8", dot: "#2563EB" },
  SUBMITTED_FOR_APPROVAL: { label: "Community Review", bg: "#F3E8FF", fg: "#7E22CE", dot: "#9333EA" },
  APPROVED: { label: "Completed", bg: "#DCFCE7", fg: "#15803D", dot: "#16A34A" },
};

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

const FILTERS = ["All", "REPORTED", "IN_PROGRESS", "COMPLETED", "COMMUNITY_REVIEW", "CLOSED"];

function StatusBadge({ status }: { status: string }) {
  const c = NEW_STATUS_COLORS[status as keyof typeof NEW_STATUS_COLORS] ?? NEW_STATUS_COLORS.REPORTED;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: c.bg, color: c.fg,
      padding: "3px 10px", borderRadius: 99,
      fontSize: 10, fontWeight: 700,
      letterSpacing: "0.05em", textTransform: "uppercase",
      whiteSpace: "nowrap", flexShrink: 0,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  );
}

// Minimal timeline for the card
function MiniTimeline({ status }: { status: string }) {
  // Simplistic timeline
  const stages = [
    { key: "REPORTED", label: "Reported" },
    { key: "ASSIGNED", label: "Assigned" },
    { key: "IN_PROGRESS", label: "Working" },
    { key: "COMPLETED", label: "Done" }
  ];
  
  let currentIdx = 0;
  if (status === 'ASSIGNED' || status === 'DEPARTMENT_ASSIGNED' || status === 'EMPLOYEE_ASSIGNED') currentIdx = 1;
  if (status === 'IN_PROGRESS') currentIdx = 2;
  if (status === 'COMPLETED' || status === 'APPROVED' || status === 'SUBMITTED_FOR_APPROVAL' || status === 'CLOSED' || status === 'COMMUNITY_REVIEW') currentIdx = 3;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%', marginTop: 8 }}>
      {stages.map((st, idx) => (
        <React.Fragment key={st.key}>
          <div style={{
            width: 12, height: 12, borderRadius: '50%',
            background: idx <= currentIdx ? T.accent : T.border,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {idx <= currentIdx && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff' }} />}
          </div>
          {idx < stages.length - 1 && (
            <div style={{ height: 2, flex: 1, background: idx < currentIdx ? T.accent : T.border, borderRadius: 1 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function IssueCard({ issue }: { issue: any }) {
  const router = useRouter();
  const meta = TYPE_META[issue.issue_type] ?? TYPE_META.default;
  const date = new Date(
    issue.created_at?.toDate ? issue.created_at.toDate() : issue.created_at
  ).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const loc = issue.location_label?.split(",")[0] ?? "Near you";

  return (
    <div
      style={{
        borderRadius: 20, overflow: "hidden",
        background: T.raised,
        boxShadow: SH.raised,
        marginBottom: 16,
      }}
    >
      <div style={{ height: 4, background: `linear-gradient(90deg, ${meta.fg}55, transparent 80%)` }} />
      <div style={{ padding: "16px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, boxShadow: SH.raisedSm,
            }}>
              {meta.emoji}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.text1, marginBottom: 2 }}>{issue.title}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: meta.fg, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {issue.issue_type}
              </div>
            </div>
          </div>
          <StatusBadge status={issue.status} />
        </div>

        <p style={{ fontSize: 13, color: T.text2, margin: '0 0 16px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {issue.description || 'No description provided.'}
        </p>

        <MiniTimeline status={issue.status} />

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, fontSize: 11, color: T.text3, fontWeight: 500, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <MapPin size={12} color={T.accent} /> {loc}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={12} /> {date}
          </div>
          {issue.department && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <ShieldAlert size={12} /> Dept Assigned
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
          <button 
            onClick={() => router.push(`/issue?id=${issue.id}`)}
            style={{ flex: 1, padding: '8px', borderRadius: 10, background: T.accentTint, color: T.accentOnTint, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            View Details
          </button>
          <button style={{ padding: '8px 12px', borderRadius: 10, background: 'transparent', color: T.text2, border: `1px solid ${T.border}`, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Share2 size={14} /> Share
          </button>
          {issue.status === 'REPORTED' && (
            <button style={{ padding: '8px 12px', borderRadius: 10, background: '#FEE2E2', color: '#B91C1C', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

export default function MyReportsTab({ user, profile }: { user: any, profile: any }) {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    async function setupRealtime() {
      try {
        const { collection, query, where, onSnapshot, orderBy } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const q = query(
          collection(db, 'issues'), 
          where('reporter_id', '==', user.uid)
        );
        unsubscribe = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          data.sort((a: any, b: any) => {
            const timeA = a.created_at?.toMillis ? a.created_at.toMillis() : 0;
            const timeB = b.created_at?.toMillis ? b.created_at.toMillis() : 0;
            return timeB - timeA;
          });
          setIssues(data);
          setLoading(false);
        });
      } catch (error) {
        console.error("Error setting up reports listener:", error);
        setLoading(false);
      }
    }
    setupRealtime();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [user]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: T.text3 }}>Loading your reports...</div>;
  }

  const filtered = issues.filter((i: any) => {
    const sMap: any = {
      'REPORTED': ['REPORTED'],
      'IN_PROGRESS': ['IN_PROGRESS', 'DEPARTMENT_ASSIGNED', 'EMPLOYEE_ASSIGNED', 'COMPANY_ASSIGNED'],
      'COMPLETED': ['APPROVED', 'COMPLETED', 'CLOSED'],
      'COMMUNITY_REVIEW': ['SUBMITTED_FOR_APPROVAL', 'COMMUNITY_REVIEW'],
      'CLOSED': ['CLOSED']
    };
    const okStatus = filter === "All" || (sMap[filter] && sMap[filter].includes(i.status));
    const searchLower = search.toLowerCase();
    const okSearch = !search || 
      (i.title || '').toLowerCase().includes(searchLower) || 
      (i.issue_type || '').toLowerCase().includes(searchLower) ||
      (i.location_label || '').toLowerCase().includes(searchLower) ||
      (i.id || '').toLowerCase().includes(searchLower);
    return okStatus && okSearch;
  });

  const total = issues.length;
  const resolved = issues.filter(i => i.status === 'CLOSED' || i.status === 'APPROVED' || i.status === 'COMPLETED').length;
  const pending = issues.filter(i => i.status !== 'CLOSED' && i.status !== 'APPROVED' && i.status !== 'COMPLETED').length;

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Analytics Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div style={{ background: T.raised, padding: '16px 12px', borderRadius: 16, boxShadow: SH.raised, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: T.text1 }}>{total}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase' }}>Total</div>
        </div>
        <div style={{ background: T.raised, padding: '16px 12px', borderRadius: 16, boxShadow: SH.raised, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#15803D' }}>{resolved}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase' }}>Resolved</div>
        </div>
        <div style={{ background: T.raised, padding: '16px 12px', borderRadius: 16, boxShadow: SH.raised, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#C2410C' }}>{pending}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase' }}>Pending</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={14} color={T.text3} style={{
          position: "absolute", left: 14, top: "50%",
          transform: "translateY(-50%)", pointerEvents: "none",
        }} />
        <input
          type="text"
          placeholder="Search by title, location, or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "12px 14px 12px 40px",
            borderRadius: 14, border: `1px solid ${T.border}`,
            background: T.raised, boxShadow: SH.insetSoft,
            color: T.text1, fontSize: 14, fontWeight: 500,
            outline: "none", boxSizing: "border-box", fontFamily: "inherit",
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, marginBottom: 8, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {FILTERS.map(f => {
          const active = filter === f;
          const c = NEW_STATUS_COLORS[f as keyof typeof NEW_STATUS_COLORS];
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              whiteSpace: 'nowrap', padding: '8px 16px', borderRadius: 99,
              fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
              background: active ? (c?.bg || T.accentTint) : T.raised,
              color: active ? (c?.fg || T.accentOnTint) : T.text2,
              boxShadow: active ? SH.insetSoft : SH.raisedSm,
              fontFamily: 'inherit'
            }}>
              {f === 'All' ? 'All Reports' : (c?.label || f)}
            </button>
          )
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: T.text3, fontSize: 14, background: T.raised, borderRadius: 20 }}>
          {issues.length === 0 ? "You haven't reported any issues yet." : "No reports match your filters."}
        </div>
      ) : (
        <div>
          {filtered.map(issue => <IssueCard key={issue.id} issue={issue} />)}
        </div>
      )}
    </div>
  );
}
