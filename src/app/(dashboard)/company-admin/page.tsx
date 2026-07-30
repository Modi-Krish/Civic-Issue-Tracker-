'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Briefcase, Building, Star, CheckCircle, TrendingUp, ArrowRight, ShieldCheck, FileSignature } from 'lucide-react';
import Link from 'next/link';

export default function CompanyAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ rating: 0, completed: 0, activeContracts: 0, openBids: 0 });

  useEffect(() => {
    // In a real scenario, this would fetch from the DB using the company associated with auth.uid()
    // Mocking for Phase 5 UI presentation
    setTimeout(() => {
      setStats({
        rating: 4.8,
        completed: 124,
        activeContracts: 3,
        openBids: 2
      });
      setLoading(false);
    }, 500);
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
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 8px" }}>Company Operations</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: 14 }}>Manage active contracts, submit bids, and track SLA performance.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button style={{
            padding: "12px 24px", borderRadius: 14, background: "rgba(255,255,255,0.05)",
            color: "white", fontSize: 13, fontWeight: 800, border: "1.5px solid rgba(255,255,255,0.1)", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8
          }}>
            <Building size={16} /> Manage Team
          </button>
          <button style={{
            padding: "12px 24px", borderRadius: 14, background: "linear-gradient(135deg, #FF2E11, #A79277)",
            color: "white", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer",
            boxShadow: "0 8px 24px rgba(255, 46, 17, 0.3)", display: "flex", alignItems: "center", gap: 8
          }}>
            <Briefcase size={16} /> Browse Tenders
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 40 }}>
        <div style={statCardStyle}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(251, 191, 36, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fbbf24" }}>
            <Star size={24} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Performance</p>
            <h3 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{loading ? '-' : stats.rating}</h3>
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
            <FileSignature size={24} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Pending Bids</p>
            <h3 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{loading ? '-' : stats.openBids}</h3>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1.5px solid rgba(255,255,255,0.05)", padding: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Open Government Tenders</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[1, 2].map(i => (
              <div key={i} style={{ padding: 20, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>Sanitation Services - Sector {i}A</h4>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>Closes in {i * 3} days</p>
                </div>
                <button style={{ padding: "8px 16px", borderRadius: 10, background: "rgba(255, 46, 17, 0.1)", color: "#FF2E11", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer" }}>Submit Bid</button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1.5px solid rgba(255,255,255,0.05)", padding: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Your Active Contracts</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[1, 2].map(i => (
              <div key={i} style={{ padding: 20, borderRadius: 16, background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>Water Line Repair - Downtown</h4>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>Expires Dec 2026</p>
                </div>
                <div style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(16, 185, 129, 0.2)", color: "#10b981", fontSize: 11, fontWeight: 800 }}>ACTIVE</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
