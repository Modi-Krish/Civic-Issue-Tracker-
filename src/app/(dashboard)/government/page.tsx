'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Briefcase, Map, FileText, AlertTriangle, ShieldCheck, ArrowRight, BarChart3, Users } from 'lucide-react';
import Link from 'next/link';

export default function GovernmentDashboard() {
  const [stats, setStats] = useState({ openTenders: 0, activeContracts: 0, reportedIssues: 0, unassignedIssues: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient();
      
      const { count: tenders } = await supabase.from('tenders').select('*', { count: 'exact', head: true }).eq('status', 'OPEN');
      const { count: contracts } = await supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE');
      const { count: reported } = await supabase.from('issues').select('*', { count: 'exact', head: true }).eq('status', 'REPORTED');
      const { count: unassigned } = await supabase.from('issues').select('*', { count: 'exact', head: true }).is('company_id', null);

      setStats({
        openTenders: tenders || 0,
        activeContracts: contracts || 0,
        reportedIssues: reported || 0,
        unassignedIssues: unassigned || 0,
      });
      setLoading(false);
    }
    loadStats();
  }, []);

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh", background: "#0d0d0f", fontFamily: "'Inter', sans-serif",
    color: "#ffffff", padding: "32px 24px", maxWidth: 1200, margin: "0 auto"
  };

  const statCardStyle = {
    padding: 24, borderRadius: 24,
    background: "rgba(255,255,255,0.02)", border: "1.5px solid rgba(255,255,255,0.05)",
    display: "flex", alignItems: "center", gap: 20
  };

  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 8px" }}>City Command Center</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: 14 }}>Oversee infrastructure, active tenders, and city operations.</p>
        </div>
        <button style={{
          padding: "12px 24px", borderRadius: 14, background: "linear-gradient(135deg, #FF2E11, #A79277)",
          color: "white", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer",
          boxShadow: "0 8px 24px rgba(255, 46, 17, 0.3)", display: "flex", alignItems: "center", gap: 8
        }}>
          <FileText size={16} /> Publish New Tender
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 40 }}>
        <div style={statCardStyle}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(167, 146, 119, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#A79277" }}>
            <Briefcase size={24} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Open Tenders</p>
            <h3 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{loading ? '-' : stats.openTenders}</h3>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Active Contracts</p>
            <h3 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{loading ? '-' : stats.activeContracts}</h3>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255, 46, 17, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF2E11" }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Unassigned Issues</p>
            <h3 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{loading ? '-' : stats.unassignedIssues}</h3>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1.5px solid rgba(255,255,255,0.05)", padding: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Recent Tenders</h2>
            <Link href="#" style={{ fontSize: 13, fontWeight: 700, color: "#FF2E11", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ padding: 20, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>Road Maintenance - Zone {i}</h4>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>Budget: $250,000 • 5 Bids Pending</p>
                </div>
                <button style={{ padding: "8px 16px", borderRadius: 10, background: "rgba(255, 46, 17, 0.1)", color: "#FF2E11", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer" }}>Evaluate</button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1.5px solid rgba(255,255,255,0.05)", padding: 32, flex: 1, display: "flex", flexDirection: "column" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 24px" }}>City Map Overview</h2>
            <div style={{ flex: 1, minHeight: 200, borderRadius: 16, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
              <Map size={32} color="rgba(255,255,255,0.2)" />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>Interactive Map Loading...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
