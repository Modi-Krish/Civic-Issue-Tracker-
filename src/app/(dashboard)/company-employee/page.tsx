'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, Clock, MapPin, Camera, AlertCircle, Wrench } from 'lucide-react';
import Link from 'next/link';

export default function CompanyEmployeeDashboard() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock loading for UI presentation
    setTimeout(() => setLoading(false), 500);
  }, []);

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh", background: "#0d0d0f", fontFamily: "'Inter', sans-serif",
    color: "#ffffff", padding: "32px 24px", maxWidth: 1200, margin: "0 auto"
  };

  return (
    <div style={pageStyle}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 8px" }}>My Tasks</h1>
        <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: 14 }}>Field execution and repair assignments.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        
        {/* Task List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ padding: 24, borderRadius: 24, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", fontSize: 11, fontWeight: 800 }}>URGENT</span>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: "12px 0 6px" }}>Pothole Repair - 5th Avenue</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}><MapPin size={14}/> 40.7128, -74.0060</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 4px" }}>Reported 2 hours ago</p>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24", display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}><Clock size={14}/> Assigned</span>
              </div>
            </div>
            
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button style={{ flex: 1, padding: "12px", borderRadius: 12, background: "linear-gradient(135deg, #FF2E11, #A79277)", color: "white", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={16} /> Mark Completed
              </button>
              <button style={{ padding: "12px", borderRadius: 12, background: "rgba(255,255,255,0.05)", color: "white", border: "1px solid rgba(255,255,255,0.1)", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                <Camera size={16} /> Add After Photo
              </button>
            </div>
          </div>

          <div style={{ padding: 24, borderRadius: 24, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", opacity: 0.7 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(16, 185, 129, 0.1)", color: "#10b981", fontSize: 11, fontWeight: 800 }}>LOW</span>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: "12px 0 6px" }}>Streetlight Outage</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}><MapPin size={14}/> 40.7282, -73.9942</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 4px" }}>Reported yesterday</p>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#10b981", display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}><Wrench size={14}/> In Progress</span>
              </div>
            </div>
            
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button style={{ flex: 1, padding: "12px", borderRadius: 12, background: "linear-gradient(135deg, #10b981, #059669)", color: "white", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={16} /> Mark Completed
              </button>
            </div>
          </div>
        </div>

        {/* Map View */}
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1.5px solid rgba(255,255,255,0.05)", padding: 24, display: "flex", flexDirection: "column" }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 16px" }}>Task Locations</h2>
          <div style={{ flex: 1, minHeight: 300, borderRadius: 16, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
            <MapPin size={32} color="rgba(255,255,255,0.2)" />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>Map Loading...</span>
          </div>
        </div>

      </div>
    </div>
  );
}
