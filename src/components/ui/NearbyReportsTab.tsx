'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from 'next/dynamic';
import { Search, MapPin, Heart, Clock, Navigation, Loader2 } from "lucide-react";

const MapComponents = dynamic<{
  issues: any[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onBoundsChange: (b: any) => void;
  userLocation: [number, number] | null;
  radiusMeters: number;
}>(
  () => import('./MapComponents'),
  {
    ssr: false,
    loading: () => <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888780' }}>Loading Map Engine...</div>,
  }
);

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
};

const SH = {
  raised:    '8px 8px 16px ' + T.shD + ', -8px -8px 16px ' + T.shL,
  raisedSm:  '4px 4px 8px ' + T.shD + ', -4px -4px 8px ' + T.shL,
  insetSoft: 'inset 3px 3px 7px ' + T.shD + ', inset -3px -3px 7px ' + T.shL,
};

const STATUS_COLORS: Record<string, { label: string; bg: string; fg: string; dot: string }> = {
  REPORTED:               { label: "Reported",    bg: "#E5E7EB", fg: "#4B5563", dot: "#6B7280" },
  IN_PROGRESS:            { label: "In Progress", bg: "#FFEDD5", fg: "#C2410C", dot: "#EA580C" },
  COMPLETED:              { label: "Completed",   bg: "#DCFCE7", fg: "#15803D", dot: "#16A34A" },
  COMMUNITY_REVIEW:       { label: "Review",      bg: "#F3E8FF", fg: "#7E22CE", dot: "#9333EA" },
  ASSIGNED:               { label: "Assigned",    bg: "#DBEAFE", fg: "#1D4ED8", dot: "#2563EB" },
  DEPARTMENT_ASSIGNED:    { label: "Assigned",    bg: "#DBEAFE", fg: "#1D4ED8", dot: "#2563EB" },
  EMPLOYEE_ASSIGNED:      { label: "Assigned",    bg: "#DBEAFE", fg: "#1D4ED8", dot: "#2563EB" },
  SUBMITTED_FOR_APPROVAL: { label: "Review",     bg: "#F3E8FF", fg: "#7E22CE", dot: "#9333EA" },
  APPROVED:               { label: "Completed",   bg: "#DCFCE7", fg: "#15803D", dot: "#16A34A" },
  CLOSED:                 { label: "Closed",      bg: "#F0EEE8", fg: "#888780", dot: "#888780" },
};

const TYPE_META: Record<string, { emoji: string; bg: string; fg: string }> = {
  "Road Damage":       { emoji: "\u{1f6a7}", bg: "#E6F1FB", fg: "#0C447C" },
  "Water Leakage":     { emoji: "\u{1f4a7}", bg: "#EAF3DE", fg: "#27500A" },
  "Electricity Fault": { emoji: "\u26a1",     bg: "#FAEEDA", fg: "#854F0B" },
  "Sanitation":        { emoji: "\u{1f9f9}", bg: "#FAECE7", fg: "#712B13" },
  "Streetlight":       { emoji: "\u{1f4a1}", bg: "#FAEEDA", fg: "#854F0B" },
  "Drainage":          { emoji: "\u{1f30a}", bg: "#EAF3DE", fg: "#27500A" },
  "Other":             { emoji: "\u{1f4cb}", bg: "#EEEDFE", fg: "#3C3489" },
  default:             { emoji: "\u{1f4cb}", bg: "#EEEDFE", fg: "#3C3489" },
};

const RADIUS_KM = 5;
const RADIUS_METERS = RADIUS_KM * 1000;

// ── Haversine distance in km ──────────────────────────────────────────────────
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 0.1) return Math.round(km * 1000) + 'm';
  if (km < 1) return (km * 1000).toFixed(0) + 'm';
  return km.toFixed(1) + 'km';
}

// ── Approximate area for privacy (strip first segment which often has house/building) ──
function getApproxArea(label: string | undefined): string {
  if (!label) return "Nearby Area";
  const parts = label.split(',').map(p => p.trim());
  // Skip first part (often exact address), take next 2-3 parts
  if (parts.length >= 3) return parts.slice(1, 3).join(', ');
  if (parts.length === 2) return parts[1];
  return parts[0];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.REPORTED;
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

function NearbyCard({ issue, isSelected, onClick }: { issue: any; isSelected: boolean; onClick: () => void }) {
  const meta = TYPE_META[issue.issue_type] || TYPE_META.default;
  const approxArea = getApproxArea(issue.location_label);
  const date = new Date(
    issue.created_at?.toDate ? issue.created_at.toDate() : issue.created_at
  ).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const distLabel = typeof issue._distKm === 'number' ? formatDistance(issue._distKm) : '';
  const supportCount = issue.support_count || 0;

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 20, padding: 16, cursor: 'pointer',
        background: isSelected ? T.accentTint : T.raised,
        border: isSelected ? '2px solid ' + T.accent + '55' : '2px solid transparent',
        boxShadow: isSelected ? SH.raisedSm + ', 0 0 0 2px ' + T.accent + '25' : SH.raisedSm,
        transition: 'all 0.2s ease',
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14, background: meta.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
        }}>
          {meta.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
            {issue.title}
          </div>
          <div style={{ fontSize: 11, color: T.text3, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
            <MapPin size={10} color={T.accent} />
            <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{approxArea}</span>
            {distLabel && (
              <>
                <span style={{ margin: '0 2px' }}>&bull;</span>
                <Navigation size={10} />
                <span>{distLabel}</span>
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <StatusBadge status={issue.status} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: T.text3, fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {date}</span>
              {supportCount > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#C2410C', background: '#FFEDD5', padding: '2px 8px', borderRadius: 99 }}>
                  <Heart size={12} /> {supportCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function NearbyReportsTab({ user, profile }: { user: any; profile: any }) {
  const [allIssues, setAllIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [locLoading, setLocLoading] = useState(true);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // ── Get user location ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setLocLoading(false);
      },
      (err) => {
        console.warn("Location denied or unavailable:", err.message);
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  // ── Fetch issues from Firestore ─────────────────────────────────────────────
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    async function fetchIssues() {
      try {
        const { collection, query, onSnapshot, orderBy } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const q = query(collection(db, 'issues'), orderBy('created_at', 'desc'));
        unsubscribe = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAllIssues(data);
          setLoading(false);
        });
      } catch (error) {
        console.error("Error fetching issues:", error);
        setLoading(false);
      }
    }
    fetchIssues();
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // ── Filter issues within 5km of user location ──────────────────────────────
  const nearbyIssues = (() => {
    if (userLat === null || userLng === null) return [];

    return allIssues
      .filter(i => i.location_lat && i.location_lng)
      .map(i => {
        const dist = getDistanceKm(userLat, userLng, i.location_lat, i.location_lng);
        return { ...i, _distKm: dist };
      })
      .filter(i => i._distKm <= RADIUS_KM)
      .sort((a, b) => a._distKm - b._distKm);
  })();

  // ── Apply search filter on top of nearby ────────────────────────────────────
  const filtered = nearbyIssues.filter(i => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (i.title || '').toLowerCase().includes(s) ||
           (i.location_label || '').toLowerCase().includes(s) ||
           (i.issue_type || '').toLowerCase().includes(s) ||
           (i.id || '').toLowerCase().includes(s);
  });

  // ── Analytics from real nearby data ─────────────────────────────────────────
  const roadCount = nearbyIssues.filter(i => i.issue_type === 'Road Damage').length;
  const waterCount = nearbyIssues.filter(i => i.issue_type === 'Water Leakage').length;
  const elecCount = nearbyIssues.filter(i => i.issue_type === 'Electricity Fault').length;

  const handleBoundsChange = useCallback((_bounds: any) => {
    // Reserved for future map-area filtering
  }, []);

  const userLocation: [number, number] | null = (userLat !== null && userLng !== null) ? [userLat, userLng] : null;

  // ── Loading states ──────────────────────────────────────────────────────────
  if (locLoading || loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <Loader2 size={32} color={T.accent} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ color: T.text2, fontWeight: 600, fontSize: 14 }}>
          {locLoading ? 'Getting your location...' : 'Loading nearby issues...'}
        </div>
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
      </div>
    );
  }

  if (!userLocation) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', background: T.raised, borderRadius: 20, boxShadow: SH.raisedSm }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>{'\u{1f4cd}'}</div>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text1, marginBottom: 8 }}>Location Required</h3>
        <p style={{ fontSize: 13, color: T.text3, lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
          Please enable location access in your browser settings to see reports near you.
        </p>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 8 }}>
      <style>{[
        '.nearby-layout { display: grid; grid-template-columns: 1fr; gap: 20px; }',
        '@media (min-width: 1024px) { .nearby-layout { grid-template-columns: 1fr 400px; align-items: stretch; height: calc(100vh - 220px); } }',
        '.nearby-map-container { height: 400px; border-radius: 24px; overflow: hidden; background: ' + T.raised + '; box-shadow: ' + SH.raised + '; border: 1px solid ' + T.border + '; }',
        '@media (min-width: 1024px) { .nearby-map-container { height: 100%; } }',
        '.nearby-list-container { display: flex; flex-direction: column; }',
        '@media (min-width: 1024px) { .nearby-list-container { height: 100%; overflow-y: auto; padding-right: 8px; } }',
      ].join('\n')}</style>

      {/* Analytics Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        <div style={{ background: T.raised, padding: '12px 8px', borderRadius: 16, boxShadow: SH.raisedSm, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: T.text1 }}>{nearbyIssues.length}</div>
          <div style={{ fontSize: 9, fontWeight: 800, color: T.text3, textTransform: 'uppercase' }}>Within {RADIUS_KM}km</div>
        </div>
        <div style={{ background: T.raised, padding: '12px 8px', borderRadius: 16, boxShadow: SH.raisedSm, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#0C447C' }}>{roadCount}</div>
          <div style={{ fontSize: 9, fontWeight: 800, color: T.text3, textTransform: 'uppercase' }}>Road</div>
        </div>
        <div style={{ background: T.raised, padding: '12px 8px', borderRadius: 16, boxShadow: SH.raisedSm, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#27500A' }}>{waterCount}</div>
          <div style={{ fontSize: 9, fontWeight: 800, color: T.text3, textTransform: 'uppercase' }}>Water</div>
        </div>
        <div style={{ background: T.raised, padding: '12px 8px', borderRadius: 16, boxShadow: SH.raisedSm, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#854F0B' }}>{elecCount}</div>
          <div style={{ fontSize: 9, fontWeight: 800, color: T.text3, textTransform: 'uppercase' }}>Electric</div>
        </div>
      </div>

      <div className="nearby-layout">
        {/* Map */}
        <div className="nearby-map-container">
          <MapComponents
            issues={filtered}
            selected={selectedId}
            onSelect={(id: string | null) => {
              setSelectedId(id);
              if (id && listRef.current) {
                const el = listRef.current.querySelector('[data-id="' + id + '"]');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }}
            onBoundsChange={handleBoundsChange}
            userLocation={userLocation}
            radiusMeters={RADIUS_METERS}
          />
        </div>

        {/* List */}
        <div className="nearby-list-container" ref={listRef}>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Search size={14} color={T.text3} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search by title, area, category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "12px 14px 12px 40px", borderRadius: 14,
                border: '1px solid ' + T.border,
                background: T.raised, boxShadow: SH.insetSoft,
                color: T.text1, fontSize: 14, fontWeight: 500,
                outline: "none", boxSizing: "border-box", fontFamily: "inherit",
              }}
            />
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: T.text3, fontSize: 13, background: T.raised, borderRadius: 20 }}>
              {nearbyIssues.length === 0
                ? 'No issues found within ' + RADIUS_KM + 'km of your location.'
                : 'No results match your search.'}
            </div>
          ) : (
            <div>
              {filtered.slice(0, 100).map(issue => (
                <div key={issue.id} data-id={issue.id}>
                  <NearbyCard
                    issue={issue}
                    isSelected={selectedId === issue.id}
                    onClick={() => setSelectedId(selectedId === issue.id ? null : issue.id)}
                  />
                </div>
              ))}
              {filtered.length > 100 && (
                <div style={{ textAlign: 'center', fontSize: 12, color: T.text3, padding: 12 }}>
                  Showing first 100 results. Zoom in on the map to narrow results.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
