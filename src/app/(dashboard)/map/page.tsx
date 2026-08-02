'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { MapPin, Navigation, Search, Info, Plus, ChevronRight } from 'lucide-react';

// ── Design tokens ─────────────────────────────────────────────────────────────
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
  raised:    `8px 8px 16px ${T.shD}, -8px -8px 16px ${T.shL}`,
  raisedSm:  `4px 4px 8px ${T.shD}, -4px -4px 8px ${T.shL}`,
  insetSoft: `inset 3px 3px 7px ${T.shD}, inset -3px -3px 7px ${T.shL}`,
};

const LEAFLET_CSS_LINK = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

const MapComponents = dynamic<{ issues: any[]; selected: string | null; onSelect: (id: string | null) => void }>(
  () => import('./MapComponents'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        height: 300, background: T.raised, borderRadius: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: T.text3, fontWeight: 700, fontSize: 13,
        boxShadow: SH.raisedSm,
      }}>
        Initializing Map Engine…
      </div>
    ),
  }
);

const ISSUE_EMOJI: Record<string, string> = {
  'Road Damage': '🚧', 'Water Leakage': '💧', 'Electricity Fault': '💡',
  'Sanitation': '🧹', 'Streetlight': '💡', 'Drainage': '🌊', 'Other': '📋',
};

// Dept-color status palette
const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  REPORTED:               { label: 'Reported',    color: '#0C447C', bg: '#E6F1FB' },
  IN_PROGRESS:            { label: 'In Progress', color: '#27500A', bg: '#EAF3DE' },
  DEPARTMENT_ASSIGNED:    { label: 'At Dept',     color: '#3C3489', bg: '#EEEDFE' },
  EMPLOYEE_ASSIGNED:      { label: 'With Staff',  color: '#3C3489', bg: '#EEEDFE' },
  SUBMITTED_FOR_APPROVAL: { label: 'Pending',     color: '#854F0B', bg: '#FAEEDA' },
  CLOSED:                 { label: 'Resolved',    color: '#085041', bg: '#E1F5EE' },
  APPROVED:               { label: 'Approved',    color: '#085041', bg: '#E1F5EE' },
  REJECTED:               { label: 'Rejected',    color: '#791F1F', bg: '#FCEBEB' },
};

const FILTER_LABELS: Record<string, string> = { REPORTED: 'Reported', IN_PROGRESS: 'In Progress', APPROVED: 'Approved', CLOSED: 'Resolved' };

export default function MapPage() {
  const router = useRouter();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const q = query(collection(db, 'issues'), orderBy('created_at', 'desc'));
        const snapshot = await getDocs(q);
        const mapped = snapshot.docs.map(doc => {
          const i = doc.data();
          return {
            id: doc.id, ...i,
            area: i.location_label || 'Local Area',
            emoji: ISSUE_EMOJI[i.issue_type] || '📋',
            dist: 'Near',
            lat: i.location_lat || 28.635,
            lng: i.location_lng || 77.224,
          };
        });
        setIssues(mapped);
      } catch (error) {
        console.error('Error loading map issues:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = issues.filter(i => {
    const matchSearch = i.title.toLowerCase().includes(search.toLowerCase()) || i.area.toLowerCase().includes(search.toLowerCase());
    const matchFilter = !filterStatus || i.status === filterStatus;
    return matchSearch && matchFilter;
  });

  const selectedIssue = issues.find(i => i.id === selected);

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: T.base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.accent, animation: 'spin 1s linear infinite' }} />
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: T.base,
      fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
      color: T.text1,
      paddingBottom: 100,
    }}>
      <div style={{ maxWidth: 500, margin: '0 auto', padding: '0 16px' }}>

        {/* Header */}
        <div style={{ padding: '24px 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', margin: 0, color: T.text1 }}>Issue Map</h1>
            <p style={{ fontSize: 11, color: T.text3, margin: '4px 0 0', fontWeight: 600 }}>
              {issues.length} LIVE REPORTS NEARBY
            </p>
          </div>
          <button
            onClick={() => router.push('/report')}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 14,
              background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
              border: 'none', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer',
              boxShadow: `${SH.raisedSm}, 0 4px 12px ${T.accent}40`,
              fontFamily: 'inherit',
            }}
          >
            <Plus size={14} strokeWidth={3} /> Report
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <Search size={14} color={T.text3} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search problems or areas…"
            style={{
              width: '100%', padding: '13px 14px 13px 40px', borderRadius: 14,
              background: T.raised, border: `1px solid ${T.border}`,
              boxShadow: SH.insetSoft,
              fontSize: 14, color: T.text1, outline: 'none',
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 6 }}>
          {([null, 'REPORTED', 'IN_PROGRESS', 'APPROVED', 'CLOSED'] as (string | null)[]).map(s => {
            const active = filterStatus === s;
            const cfg = s ? STATUS_STYLE[s] : null;
            return (
              <button key={String(s)} onClick={() => setFilterStatus(s)} style={{
                padding: '8px 16px', borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                border: 'none', cursor: 'pointer', flexShrink: 0,
                background: active ? (cfg ? cfg.bg : T.accentTint) : T.raised,
                color: active ? (cfg ? cfg.color : T.accentDark) : T.text3,
                boxShadow: active ? SH.insetSoft : SH.raisedSm,
                fontFamily: 'inherit',
              }}>
                {s === null ? 'All Problems' : FILTER_LABELS[s]}
              </button>
            );
          })}
        </div>

        {/* Map */}
        <div style={{ marginBottom: 24, position: 'relative' }}>
          <link rel="stylesheet" href={LEAFLET_CSS_LINK} />
          <div style={{
            height: 320, borderRadius: 24, overflow: 'hidden',
            border: `1px solid ${T.border}`, background: T.raised,
            boxShadow: SH.raised,
          }}>
            <MapComponents issues={filtered} selected={selected} onSelect={setSelected} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingLeft: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.accent, boxShadow: `0 0 10px ${T.accent}` }} />
            <span style={{ fontSize: 11, color: T.text1, fontWeight: 800, letterSpacing: '0.05em' }}>LIVE TRACKING ACTIVE</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: T.text3, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Info size={12} /> Syncing Every 10s
            </span>
          </div>
        </div>

        {/* Selected issue card */}
        {selectedIssue && (
          <div
            onClick={() => router.push(`/issue?id=${selectedIssue.id}`)}
            style={{
              marginBottom: 20, borderRadius: 22, overflow: 'hidden',
              background: T.raised, boxShadow: SH.raised,
              cursor: 'pointer',
              border: `2px solid ${T.accent}55`,
            }}
          >
            <div style={{ height: 3, background: `linear-gradient(90deg, ${T.accent}, transparent)` }} />
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, boxShadow: SH.raisedSm,
              }}>
                {selectedIssue.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.text1, marginBottom: 4 }}>{selectedIssue.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: T.text3, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={11} color={T.accent} />{selectedIssue.area?.split(',')[0]}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 99,
                    background: STATUS_STYLE[selectedIssue.status]?.bg,
                    color: STATUS_STYLE[selectedIssue.status]?.color,
                    boxShadow: SH.raisedSm,
                  }}>
                    {STATUS_STYLE[selectedIssue.status]?.label?.toUpperCase()}
                  </span>
                </div>
              </div>
              <ChevronRight size={16} color={T.accent} />
            </div>
          </div>
        )}

        {/* Issue list */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
            Problems List
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '40px 20px',
                background: T.raised, borderRadius: 20, boxShadow: SH.raisedSm,
                color: T.text3, fontSize: 13,
              }}>
                No active issues found in this area.
              </div>
            ) : filtered.map(issue => {
              const st = STATUS_STYLE[issue.status] ?? STATUS_STYLE.REPORTED;
              const isSel = selected === issue.id;
              return (
                <div key={issue.id} onClick={() => setSelected(isSel ? null : issue.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 18,
                  background: isSel ? T.accentTint : T.raised,
                  border: isSel ? `2px solid ${T.accent}55` : `1px solid ${T.border}`,
                  boxShadow: isSel ? `${SH.raisedSm}, 0 0 0 2px ${T.accent}25` : SH.raisedSm,
                  cursor: 'pointer', transition: 'all 0.15s',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                    background: T.raised, boxShadow: SH.raisedSm,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>
                    {issue.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {issue.title}
                    </div>
                    <div style={{ fontSize: 11, color: T.text3, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <MapPin size={10} color={T.accent} />{issue.area?.split(',')[0]}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 99,
                    background: st.bg, color: st.color, boxShadow: SH.raisedSm, flexShrink: 0,
                  }}>
                    {st.label?.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
