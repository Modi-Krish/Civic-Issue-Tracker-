'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Navigation, Search, Info, Plus, LayoutDashboard, FileText, Map as MapIcon, Settings, ChevronRight } from 'lucide-react';
import { createClient } from "@/lib/supabase/client";

const LEAFLET_CSS_LINK = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

const MapComponents = dynamic<{ issues: any[], selected: string | null, onSelect: (id: string | null) => void }>(
  () => import('./MapComponents'), 
  { 
    ssr: false,
    loading: () => <div style={{ height: 300, background: "rgba(255,255,255,0.02)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontWeight: 700 }}>Initializing Map Engine...</div>
  }
);

const ISSUE_EMOJI: Record<string, string> = {
  'Road Damage': '🚧', 'Water Leakage': '💧', 'Electricity Fault': '💡',
  'Sanitation': '🧹', 'Streetlight': '💡', 'Drainage': '🌊', 'Other': '📋',
};

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  REPORTED:               { label: "Reported",       color: "#3b82f6", bg: "#1e3a5f" },
  IN_PROGRESS:            { label: "In Progress",    color: "#34d399", bg: "#1a3a2a" },
  DEPARTMENT_ASSIGNED:    { label: "At Dept",        color: "#67e8f9", bg: "#1a2e3a" },
  EMPLOYEE_ASSIGNED:      { label: "With Staff",     color: "#FF5E41", bg: "#3a1a1a" },
  SUBMITTED_FOR_APPROVAL: { label: "Pending",        color: "#fbbf24", bg: "#3a2a0a" },
  CLOSED:                 { label: "Resolved",       color: "#10b981", bg: "#1a3a2a" },
  APPROVED:               { label: "Approved",       color: "#10b981", bg: "#1a3a2a" },
  REJECTED:               { label: "Rejected",       color: "#f87171", bg: "#3a1a1a" },
};


export default function MapPage() {
  const router = useRouter();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from('issues').select('*').order('created_at', { ascending: false });
      const mapped = (data || []).map(i => ({
        ...i,
        area: i.location_label || "Local Area",
        emoji: ISSUE_EMOJI[i.issue_type] || "📋",
        dist: "Near",
        lat: i.location_lat || 28.635,
        lng: i.location_lng || 77.224
      }));
      setIssues(mapped);
      setLoading(false);
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
      <div style={{ minHeight: "100vh", background: "#0d0d0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(255, 46, 17, 0.1)", borderTopColor: "#FF2E11", animation: "spin 1s linear infinite" }} />
        
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0f", fontFamily: "'Inter', -apple-system, sans-serif", color: "#ffffff", paddingBottom: 100 }}>
      {/* ambient */}
       <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -80, left: "25%", width: 400, height: 280, background: "radial-gradient(ellipse, rgba(255, 46, 17, 0.06) 0%, transparent 70%)", borderRadius: "50%" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 500, margin: "0 auto", padding: "0 16px" }}>

        {/* Header */}
        <div style={{ padding: "24px 0 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>Issue Map</h1>
            <p style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.35)", margin: "4px 0 0", fontWeight: 600 }}>
              {issues.length} LIVE REPORTS NEARBY
            </p>
          </div>
          <button onClick={() => router.push('/report')} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 12,
            background: "linear-gradient(135deg, #FF2E11, #A79277)", border: "none",
            color: "white", fontSize: 13, fontWeight: 800, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(255, 46, 17, 0.4)",
          }}>
            <Plus size={14} strokeWidth={3} /> Report
          </button>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 14 }}>
          <Search size={14} color="rgba(255,255,255,0.3)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search problems or areas…"
            style={{
              width: "100%", padding: "13px 14px 13px 38px", borderRadius: 14, boxSizing: "border-box",
              background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.1)",
              fontSize: 14, color: "white", outline: "none", fontFamily: "inherit",
            }}
          />
        </div>

        {/* Filter pills */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 6 }}>
          {[null, "REPORTED", "IN_PROGRESS", "APPROVED", "CLOSED"].map((s) => {
            const active = filterStatus === s;
            const labels: Record<string, string> = { REPORTED: "Reported", IN_PROGRESS: "In Progress", APPROVED: "Approved", CLOSED: "Resolved" };
            return (
              <button key={String(s)} onClick={() => setFilterStatus(s)} style={{
                padding: "8px 16px", borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                border: active ? "1.5px solid #FF5E41" : "1.5px solid rgba(255,255,255,0.08)",
                background: active ? "rgba(255, 46, 17, 0.15)" : "rgba(255,255,255,0.03)",
                color: active ? "#FF2E11" : "rgba(255,255,255,0.35)", cursor: "pointer", flexShrink: 0,
              }}>
                {s === null ? "All Problems" : labels[s]}
              </button>
            );
          })}
        </div>

        {/* Map */}
        <div style={{ marginBottom: 24, position: "relative" }}>
          {/* Inject Leaflet CSS */}
          <link rel="stylesheet" href={LEAFLET_CSS_LINK} />
          <div style={{ height: 320, borderRadius: 24, overflow: "hidden", border: "1px solid rgba(255, 46, 17, 0.3)", background: "#0d0d0f" }}>
             <MapComponents issues={filtered} selected={selected} onSelect={setSelected} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, paddingLeft: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 12px #10b981" }} />
            <span style={{ fontSize: 11, color: "white", fontWeight: 800, letterSpacing: "0.05em" }}>LIVE TRACKING ACTIVE</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: 4 }}>
              <Info size={12} /> Syncing Every 10s
            </span>
          </div>
        </div>

        {/* Selected Issue Card Overlay */}
        {selectedIssue && (
          <div onClick={() => router.push(`/issue?id=${selectedIssue.id}`)} style={{
            marginBottom: 20, borderRadius: 20, overflow: "hidden",
            border: "1.5px solid rgba(255, 46, 17, 0.4)",
            background: "rgba(255, 46, 17, 0.08)", backdropFilter: "blur(12px)", cursor: "pointer"
          }}>
            <div style={{ height: 3, background: "linear-gradient(90deg, #FF2E11, #A79277)" }} />
            <div style={{ padding: "16px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg, #FF2E11, #A79277)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0, boxShadow: "0 4px 12px rgba(255, 46, 17, 0.3)" }}>
                {selectedIssue.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "white", marginBottom: 4 }}>{selectedIssue.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={11} color="#FF5E41" />{selectedIssue.area?.split(',')[0]}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 99,
                    background: STATUS_STYLE[selectedIssue.status]?.bg,
                    color: STATUS_STYLE[selectedIssue.status]?.color,
                  }}>
                    {STATUS_STYLE[selectedIssue.status]?.label?.toUpperCase()}
                  </span>
                </div>
              </div>
              <ChevronRight size={16} color="#FF5E41" />
            </div>
          </div>
        )}

        {/* Issue List */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
            Problems List
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", borderRadius: 20, border: "1.5px dashed rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
                No active issues found in this area.
              </div>
            ) : filtered.map((issue) => {
              const st = STATUS_STYLE[issue.status] || STATUS_STYLE.REPORTED;
              const isSel = selected === issue.id;
              return (
                <div key={issue.id} onClick={() => setSelected(isSel ? null : issue.id)} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 18,
                  border: `1.5px solid ${isSel ? "#FF5E41" : "rgba(255,255,255,0.06)"}`,
                  background: isSel ? "rgba(255, 46, 17, 0.08)" : "rgba(255,255,255,0.02)",
                  cursor: "pointer", transition: "all 0.15s ease",
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                    {issue.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {issue.title}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: 3 }}>
                        <MapPin size={10} color="#FF5E41" />{issue.area?.split(',')[0]}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 99, background: st.bg, color: st.color }}>
                      {st.label?.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
