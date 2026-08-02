"use client";

import { useState, useEffect } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { subscribeToNotifications, markNotificationRead, markAllNotificationsRead } from "@/services/firestore";

// ── Design tokens ─────────────────────────────────────────────────────────────
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
} as const;

const SH = {
  raised:   `8px 8px 16px ${T.shD}, -8px -8px 16px ${T.shL}`,
  raisedSm: `4px 4px 8px ${T.shD}, -4px -4px 8px ${T.shL}`,
  inset:    `inset 5px 5px 10px ${T.shD}, inset -5px -5px 10px ${T.shL}`,
};

// ── Type config (dept-color palette) ─────────────────────────────────────────
const TYPE_CONFIG = {
  status_updated:  { emoji: "🔄", bg: "#E6F1FB", fg: "#0C447C", dot: "#0C447C" },
  issue_assigned:  { emoji: "👤", bg: "#EEEDFE", fg: "#3C3489", dot: "#3C3489" },
  reward_credited: { emoji: "🎉", bg: "#FAEEDA", fg: "#854F0B", dot: "#854F0B" },
  repair_approved: { emoji: "✅", bg: "#E1F5EE", fg: "#085041", dot: "#1D9E75" },
  issue_reported:  { emoji: "📋", bg: "#EAF3DE", fg: "#27500A", dot: "#27500A" },
  repair_rejected: { emoji: "❌", bg: "#FCEBEB", fg: "#791F1F", dot: "#791F1F" },
  default:         { emoji: "📌", bg: "#F0EEE8", fg: "#5F5E5A", dot: "#888780" },
};

function timeAgo(iso: string) {
  if (!iso) return "just now";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
}

// ── Notification Card ─────────────────────────────────────────────────────────
function NotifCard({ notif, onMarkRead }: any) {
  const cfg = TYPE_CONFIG[notif.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.default;
  const createdAt = notif.created_at?.toDate ? notif.created_at.toDate().toISOString() : notif.created_at;
  const isRead = notif.is_read;

  return (
    <div style={{
      borderRadius: 20, overflow: "hidden",
      background: isRead ? T.raised : cfg.bg,
      boxShadow: isRead ? SH.raisedSm : SH.raised,
      border: isRead ? `1px solid ${T.border}` : `1.5px solid ${cfg.dot}35`,
      cursor: "pointer",
      WebkitTapHighlightColor: "transparent",
    }}>
      {/* Unread stripe */}
      {!isRead && <div style={{ height: 3, background: `linear-gradient(90deg, ${cfg.dot}99, transparent 70%)` }} />}

      <div style={{ padding: "13px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* Emoji chip */}
        <div style={{
          width: 44, height: 44, borderRadius: 14, flexShrink: 0,
          background: T.raised, boxShadow: SH.raisedSm,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, position: "relative",
        }}>
          {cfg.emoji}
          {!isRead && (
            <div style={{
              position: "absolute", top: -2, right: -2,
              width: 9, height: 9, borderRadius: "50%",
              background: cfg.dot, border: `2px solid ${T.base}`,
            }} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: isRead ? 600 : 800, color: T.text1, lineHeight: 1.3 }}>
              {notif.title}
            </span>
            <span style={{ fontSize: 10, color: T.text3, fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0, paddingTop: 1 }}>
              {timeAgo(createdAt)}
            </span>
          </div>

          <p style={{ fontSize: 12, color: T.text2, lineHeight: 1.55, margin: "0 0 8px 0" }}>{notif.body}</p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {notif.issue_id ? (
              <span style={{ fontSize: 11, fontWeight: 700, color: T.accent, display: "flex", alignItems: "center", gap: 4 }}>
                View issue
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5h6M5.5 2L8 5l-2.5 3" stroke={T.accent} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            ) : <div />}
            {!isRead && (
              <button
                onClick={e => { e.stopPropagation(); onMarkRead(notif.id); }}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  fontSize: 10, fontWeight: 700, color: T.text3,
                  background: T.raised, border: `1px solid ${T.border}`,
                  borderRadius: 8, padding: "4px 10px", cursor: "pointer",
                  boxShadow: SH.raisedSm,
                  WebkitTapHighlightColor: "transparent",
                  fontFamily: "inherit",
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 6l2.5 3L10 3" stroke={T.accent} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Mark read
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "60px 20px", textAlign: "center",
      background: T.raised, borderRadius: 24, boxShadow: SH.inset, marginTop: 8,
    }}>
      <div style={{
        width: 68, height: 68, borderRadius: 20, marginBottom: 18,
        background: T.accentTint, boxShadow: SH.raisedSm,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
      }}>🔔</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: T.text1, marginBottom: 8 }}>No notifications.</div>
      <div style={{ fontSize: 13, color: T.text3, lineHeight: 1.65, maxWidth: 220 }}>
        You'll be notified when there are updates.
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if (user) {
        const unsubscribeNotifs = subscribeToNotifications(user.uid, data => {
          setNotifs(data);
          setLoading(false);
        });
        return () => unsubscribeNotifs();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const unreadCount = notifs.filter(n => !n.is_read).length;
  const displayed = filter === "unread" ? notifs.filter(n => !n.is_read) : notifs;

  async function markRead(id: string) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await markNotificationRead(id);
  }

  async function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    if (auth.currentUser) await markAllNotificationsRead(auth.currentUser.uid, notifs);
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: T.base,
      fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
      color: T.text1,
    }}>
      {/* Sticky top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: T.raised,
        borderBottom: `1px solid ${T.border}`,
        boxShadow: `0 4px 16px ${T.shD}`,
        padding: "16px",
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: unreadCount > 0 ? 12 : 0 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", margin: 0, color: T.text1 }}>
                Notifications
              </h1>
              {unreadCount > 0 && (
                <p style={{ fontSize: 12, color: T.text3, marginTop: 4, fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, display: "inline-block" }} />
                  {unreadCount} unread
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "8px 14px", borderRadius: 12,
                  fontSize: 11, fontWeight: 700,
                  background: T.accentTint, border: "none",
                  color: T.accentDark, cursor: "pointer",
                  boxShadow: SH.raisedSm, fontFamily: "inherit",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l2.5 3L10 3" stroke={T.accentDark} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Mark all read
              </button>
            )}
          </div>

          {/* Filter tabs */}
          {notifs.length > 0 && (
            <div style={{ display: "flex", gap: 7 }}>
              {[["all", "All", notifs.length], ["unread", "Unread", unreadCount]].map(([val, label, count]) => {
                const active = filter === val;
                return (
                  <button
                    key={val as string}
                    onClick={() => setFilter(val as string)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "7px 14px", borderRadius: 99,
                      fontSize: 11, fontWeight: 700, cursor: "pointer",
                      border: "none",
                      background: active ? T.accentTint : T.base,
                      color: active ? T.accentDark : T.text3,
                      boxShadow: active ? SH.inset : SH.raisedSm,
                      fontFamily: "inherit",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {label as string}
                    <span style={{
                      fontSize: 9, fontWeight: 800, borderRadius: 99, padding: "1px 6px",
                      background: active ? "rgba(0,0,0,0.12)" : T.raised,
                      color: active ? "inherit" : T.text3,
                    }}>
                      {count as number}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 16px 100px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 16px", color: T.text3, fontSize: 14 }}>Loading…</div>
        ) : notifs.length === 0 ? (
          <EmptyState />
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 16px", color: T.text3, fontSize: 14 }}>
            No unread notifications.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {displayed.map(n => <NotifCard key={n.id} notif={n} onMarkRead={markRead} />)}
          </div>
        )}
      </div>
    </div>
  );
}
