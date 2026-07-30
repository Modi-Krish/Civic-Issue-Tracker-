"use client";

import { useState } from "react";
import React from "react";
import { useRouter } from "next/navigation";

const mockNotifications = [
  { id: "1", type: "status_updated", title: "Issue status updated", body: "Your report 'Cracked Pavement Near City Hall' has moved to In Progress.", is_read: false, created_at: "2025-03-23T09:14:00Z", issue_id: "i1" },
  { id: "2", type: "issue_assigned", title: "Field officer assigned", body: "An officer has been assigned to inspect 'Broken Streetlight on Elm Ave'.", is_read: false, created_at: "2025-03-22T16:45:00Z", issue_id: "i2" },
  { id: "3", type: "reward_credited", title: "Points credited!", body: "You earned 50 points for reporting 'Overflowing Garbage Bin'. Keep it up!", is_read: false, created_at: "2025-03-21T11:30:00Z", issue_id: null },
  { id: "4", type: "repair_approved", title: "Repair approved", body: "The repair for 'Flooded Underpass after Rain' has been approved and closed.", is_read: true, created_at: "2025-03-20T08:00:00Z", issue_id: "i4" },
  { id: "5", type: "issue_reported", title: "Report received", body: "We've received your report about 'Graffiti on Community Board'. Thank you!", is_read: true, created_at: "2025-03-19T14:20:00Z", issue_id: "i5" },
  { id: "6", type: "repair_rejected", title: "Repair marked incomplete", body: "The submitted repair for 'Pothole on Station Road' needs further review.", is_read: true, created_at: "2025-03-18T10:05:00Z", issue_id: "i6" },
];

const TYPE_CONFIG = {
  status_updated:  { emoji: "🔄", accent: "#60a5fa", bg: "#1e3a5f" },
  issue_assigned:  { emoji: "👤", accent: "#67e8f9", bg: "#1a2e3a" },
  reward_credited: { emoji: "🎉", accent: "#f59e0b", bg: "#3a2a0a" },
  repair_approved: { emoji: "✅", accent: "#34d399", bg: "#1a3a2a" },
  issue_reported:  { emoji: "📋", accent: "#FF2E11", bg: "#3a2a1a" },
  repair_rejected: { emoji: "❌", accent: "#f87171", bg: "#3a1a1a" },
  default:         { emoji: "📌", accent: "#FF2E11", bg: "#3a2a1a" },
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
}


function NotifCard({ notif, onMarkRead }: any) {
  const cfg = TYPE_CONFIG[notif.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.default;
  const [pressed, setPressed] = useState(false);

  return (
    <div
      onMouseEnter={() => setPressed(true)} onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)} onTouchEnd={() => setPressed(false)}
      style={{ borderRadius:18, overflow:"hidden", cursor:"pointer", transition:"background 0.15s, border-color 0.15s", WebkitTapHighlightColor:"transparent",
        border:`0.5px solid ${notif.is_read ? "rgba(255,255,255,0.07)" : cfg.accent + "40"}`,
        background: notif.is_read ? (pressed?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.02)") : (pressed?`${cfg.bg}cc`:`${cfg.bg}88`),
      }}
    >
      {!notif.is_read && <div style={{ height:2.5, background:`linear-gradient(90deg,${cfg.accent}cc,transparent 70%)` }} />}
      <div style={{ padding:"13px 14px", display:"flex", gap:12, alignItems:"flex-start" }}>
        <div style={{ width:42, height:42, borderRadius:13, flexShrink:0, background:`${cfg.accent}14`, border:`0.5px solid ${cfg.accent}28`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, position:"relative" }}>
          {cfg.emoji}
          {!notif.is_read && <div style={{ position:"absolute", top:-2, right:-2, width:9, height:9, borderRadius:"50%", background:cfg.accent, border:"2px solid #0d0d0f", boxShadow:`0 0 6px ${cfg.accent}99` }} />}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8, marginBottom:4 }}>
            <span style={{ fontSize:13, fontWeight:notif.is_read?600:700, color:notif.is_read?"rgba(255,255,255,0.7)":"#fff", letterSpacing:"-0.01em", lineHeight:1.3 }}>
              {notif.title}
            </span>
            <span style={{ fontSize:10, color:"rgba(255,255,255,0.28)", fontWeight:500, whiteSpace:"nowrap", flexShrink:0, paddingTop:1 }}>
              {timeAgo(notif.created_at)}
            </span>
          </div>
          <p style={{ fontSize:12, color:"rgba(255,255,255,0.45)", lineHeight:1.55, margin:"0 0 8px 0" }}>{notif.body}</p>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            {notif.issue_id ? (
              <span style={{ fontSize:11, fontWeight:700, color:cfg.accent, display:"flex", alignItems:"center", gap:4 }}>
                View issue
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5h6M5.5 2L8 5l-2.5 3" stroke={cfg.accent} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            ) : <div />}
            {!notif.is_read && (
              <button onClick={(e) => { e.stopPropagation(); onMarkRead(notif.id); }} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.4)", background:"rgba(255,255,255,0.06)", border:"0.5px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"4px 8px", cursor:"pointer", WebkitTapHighlightColor:"transparent" }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 6l2.5 3L10 3" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Mark read
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"60px 20px", textAlign:"center", borderRadius:22, border:"1px dashed rgba(255,255,255,0.09)", background:"rgba(255,255,255,0.015)", marginTop:8 }}>
      <div style={{ width:68, height:68, borderRadius:20, marginBottom:18, background:"rgba(255, 46, 17, 0.1)", border:"1px solid rgba(255, 46, 17, 0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:30 }}>🔔</div>
      <div style={{ fontSize:17, fontWeight:800, letterSpacing:"-0.02em", marginBottom:8 }}>All caught up!</div>
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.38)", lineHeight:1.65, maxWidth:220 }}>
        You'll be notified when there are updates on your reports.
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  

  const [showEmpty, setShowEmpty] = useState(false);
  const [notifs, setNotifs] = useState(mockNotifications);
  const [filter, setFilter] = useState("all");

  const allNotifs = showEmpty ? [] : notifs;
  const unreadCount = allNotifs.filter(n => !n.is_read).length;
  const displayed = filter === "unread" ? allNotifs.filter(n => !n.is_read) : allNotifs;

  function markRead(id: string) { setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n)); }
  function markAllRead() { setNotifs(prev => prev.map(n => ({ ...n, is_read: true }))); }

  return (
    <div style={{ minHeight:"100vh", background:"#0d0d0f", fontFamily:"'Inter',-apple-system,sans-serif", color:"#fff" }}>
      <div style={{ position:"fixed", inset:0, pointerEvents: "none", overflow:"hidden", zIndex:0 }}>
        <div style={{ position:"absolute", top:-60, left:"20%", width:420, height:260, background:"radial-gradient(ellipse, rgba(255, 46, 17, 0.1) 0%, transparent 70%)", borderRadius:"50%" }} />
      </div>

      {/* TOP BAR */}
      <div style={{ position:"sticky", top:0, zIndex:50, background:"rgba(13,13,15,0.94)", backdropFilter:"blur(20px)", borderBottom:"0.5px solid rgba(255,255,255,0.07)" }}>
        <div style={{ maxWidth:480, margin:"0 auto", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg, #FF2E11, #A79277)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 10px rgba(255, 46, 17, 0.45)" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" fill="white"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <span style={{ fontSize:14, fontWeight:700, letterSpacing:"-0.02em" }}>CivicTracker</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={() => setShowEmpty(v => !v)} style={{ padding:"5px 9px", borderRadius:8, fontSize:10, fontWeight:700, background:"rgba(255,255,255,0.05)", border:"0.5px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.38)", cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.04em" }}>
              {showEmpty ? "Data" : "Empty"}
            </button>
            <div style={{ width:32, height:32, borderRadius:10, background:"linear-gradient(135deg, #FF2E11, #A79277)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800 }}>A</div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ position:"relative", zIndex:1, maxWidth:480, margin:"0 auto", padding:"0 16px 100px" }}>

        {/* Page header */}
        <div style={{ padding:"20px 0 18px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:14, cursor:"pointer" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="rgba(255,255,255,0.32)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.32)" }}>Dashboard</span>
          </div>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
            <div>
              <h1 style={{ fontSize:24, fontWeight:900, letterSpacing:"-0.04em", margin:0 }}>Notifications</h1>
              {unreadCount > 0 && (
                <p style={{ fontSize:12, color:"rgba(255,255,255,0.38)", marginTop:5, fontWeight:500, display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background: "#A79277", display:"inline-block", boxShadow: "0 0 6px #A79277" }} />
                  {unreadCount} unread
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ display:"flex", alignItems:"center", gap:5, marginTop:4, padding:"7px 13px", borderRadius:10, fontSize:11, fontWeight:700, background: "rgba(255, 46, 17, 0.12)", border: "0.5px solid rgba(255, 46, 17, 0.25)", color: "#FF2E11", cursor:"pointer", WebkitTapHighlightColor:"transparent" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l2.5 3L10 3" stroke="#FF2E11" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        {allNotifs.length > 0 && (
          <div style={{ display:"flex", gap:7, marginBottom:16 }}>
            {[["all","All",allNotifs.length],["unread","Unread",unreadCount]].map(([val,label,count]) => {
              const active = filter === val;
              return (
                <button key={val as string} onClick={() => setFilter(val as string)} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"6px 14px", borderRadius:99, fontSize:11, fontWeight:700, cursor:"pointer", transition:"all 0.15s", WebkitTapHighlightColor:"transparent",
                  border:`0.5px solid ${active?"rgba(167, 146, 119, 0.5)":"rgba(255,255,255,0.1)"}`,
                  background: active ? "rgba(255, 46, 17, 0.15)" : "transparent",
                  color: active ? "#FF2E11" : "rgba(255,255,255,0.38)",
                }}>
                  {label as string}
                  <span style={{ fontSize:9, fontWeight:800, borderRadius:99, padding:"1px 5px", background:active?"rgba(255,255,255,0.18)":"rgba(255,255,255,0.08)", color:active?"white":"rgba(255,255,255,0.28)" }}>{count as number}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Cards */}
        {allNotifs.length === 0 ? <EmptyState /> :
          displayed.length === 0 ? (
            <div style={{ textAlign:"center", padding:"48px 16px", color:"rgba(255,255,255,0.26)", fontSize:14 }}>No unread notifications.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {displayed.map(n => <NotifCard key={n.id} notif={n} onMarkRead={markRead} />)}
            </div>
          )
        }
      </div>


      
    </div>
  );
}
