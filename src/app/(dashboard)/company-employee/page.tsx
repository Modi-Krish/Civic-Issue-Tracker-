'use client';

import React, { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { getCompanyEmployeeTasks } from '@/services/firestore';
import { CheckCircle2, Clock, MapPin, Camera, Briefcase, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  REPORTED: { label: "Reported", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
  IN_PROGRESS: { label: "In Progress", color: "#fbbf24", bg: "rgba(251, 191, 36, 0.1)" },
  APPROVED: { label: "Approved", color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
  CLOSED: { label: "Resolved", color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
  EMPLOYEE_ASSIGNED: { label: "Assigned To You", color: "#a78bfa", bg: "rgba(167, 139, 250, 0.1)" },
  SUBMITTED_FOR_APPROVAL: { label: "Pending Review", color: "#a855f7", bg: "rgba(168, 85, 247, 0.1)" },
  DEPARTMENT_ASSIGNED: { label: "Dept Assigned", color: "#0ea5e9", bg: "rgba(14, 165, 233, 0.1)" },
  REJECTED: { label: "Needs Revisiting", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" },
};

export default function CompanyEmployeeDashboard() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    let unsubscribeSnap: any = null;
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if (user) {
        import('firebase/firestore').then(({ collection, query, where, onSnapshot, orderBy }) => {
          import('@/lib/firebase').then(({ db }) => {
            const q = query(collection(db, 'issues'), where('assigned_employee_id', '==', user.uid), orderBy('created_at', 'desc'));
            unsubscribeSnap = onSnapshot(q, (snapshot) => {
              const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              setTasks(tasksData);
              setLoading(false);
            }, (error) => {
              console.error('Error fetching employee tasks:', error);
              setLoading(false);
            });
          });
        });
      } else {
        setTasks([]);
        setLoading(false);
        if (unsubscribeSnap) unsubscribeSnap();
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeSnap) unsubscribeSnap();
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0f", fontFamily: "'Inter', -apple-system, sans-serif", color: "#ffffff", paddingBottom: 100 }}>
      {/* Ambient Backdrops */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -80, left: "10%", width: 400, height: 300, background: "radial-gradient(ellipse,rgba(59,130,246,0.06) 0%,transparent 70%)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: -80, right: "10%", width: 500, height: 400, background: "radial-gradient(ellipse,rgba(16,185,129,0.03) 0%,transparent 70%)", borderRadius: "50%" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>

        {/* Header */}
        <div style={{ padding: "40px 0 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "6px 14px", borderRadius: 99, background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", width: "fit-content" }}>
            <Briefcase size={14} color="#3b82f6" />
            <span style={{ fontSize: 11, fontWeight: 800, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Field Execution
            </span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 8px" }}>My Tasks</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", margin: 0, fontSize: 15, fontWeight: 500 }}>Contractor task list and execution assignments.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24, alignItems: "start" }}>

          {/* Task List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>ACTIVE JOBS</h2>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>{tasks.length} TOTAL</span>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite', margin: "0 auto 16px" }} />
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Syncing assignments...</div>
              </div>
            ) : tasks.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1.5px dashed rgba(255,255,255,0.08)" }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <Briefcase size={28} color="#3b82f6" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px" }}>No active tasks</h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", margin: 0, maxWidth: 300, marginInline: "auto" }}>You're all caught up! New tasks assigned to your company will appear here.</p>
              </div>
            ) : (
              tasks.map(task => {
                const st = STATUS_STYLE[task.status] || STATUS_STYLE.REPORTED;
                return (
                  <div key={task.id} style={{ padding: 24, borderRadius: 24, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, background: st.color }} />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
                        <Link href={`/issue?id=${task.id}`} style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8, color: "white", textDecoration: "none", letterSpacing: "-0.01em" }}>
                          {task.title}
                          <ExternalLink size={14} color="rgba(255,255,255,0.3)" />
                        </Link>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0, display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
                          <MapPin size={14} color="#3b82f6" /> {task.location_label || `${task.location_lat}, ${task.location_lng}`}
                        </p>
                      </div>
                      <span style={{ padding: "6px 12px", borderRadius: 10, background: st.bg, color: st.color, fontSize: 11, fontWeight: 800, border: `1px solid ${st.color}25`, whiteSpace: "nowrap" }}>
                        {st.label.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                      <button 
                        onClick={async () => {
                          const { doc, updateDoc } = await import('firebase/firestore');
                          const { db } = await import('@/lib/firebase');
                          await updateDoc(doc(db, 'issues', task.id), { status: 'CLOSED' });
                        }}
                        style={{ flex: 1, padding: "14px", borderRadius: 14, background: "linear-gradient(135deg, #10b981, #059669)", color: "white", border: "1px solid rgba(255,255,255,0.1)", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, transition: "transform 0.15s ease", boxShadow: "0 8px 16px rgba(16, 185, 129, 0.2)" }}
                        onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
                        onMouseOut={(e) => e.currentTarget.style.transform = "none"}
                      >
                        <CheckCircle2 size={16} /> Mark Completed
                      </button>
                      <button style={{ flex: 1, padding: "14px", borderRadius: 14, background: "rgba(255,255,255,0.05)", color: "white", border: "1px solid rgba(255,255,255,0.1)", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, transition: "background 0.15s ease" }}
                        onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                        onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                      >
                        <Camera size={16} color="rgba(255,255,255,0.6)" /> Attach Proof
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Map View */}
          <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 28, border: "1.5px solid rgba(255,255,255,0.05)", padding: 24, display: "flex", flexDirection: "column", position: "sticky", top: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 16px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Live Map</h2>
            <div style={{ width: "100%", aspectRatio: "4/3", borderRadius: 16, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, background: "url('https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/-122.4194,37.7749,12,0/600x400?access_token=invalid') center/cover", opacity: 0.15, filter: "grayscale(1)" }} />
              <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MapPin size={24} color="#3b82f6" />
                </div>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Map Module Initializing</span>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Current Region</h3>
              <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>Downtown District</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
