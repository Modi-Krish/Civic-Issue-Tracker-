"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, signOut } from "@/lib/client-actions/auth";
import {
  User, Shield, LogOut, Mail, Building2, Calendar,
  ChevronRight, Bell, HelpCircle, Star, Palette,
  Save, X, Edit2, FileText, MapPin, Clock, Award,
  Lock, Smartphone, Globe, ExternalLink,
} from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────────────────────
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

// ── Role config ───────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, { label: string; emoji: string; bg: string; fg: string }> = {
  citizen:            { label: "Citizen",        emoji: "🏙️", bg: "#E6F1FB", fg: "#0C447C" },
  department_admin:   { label: "Dept. Admin",    emoji: "🏛️", bg: "#EAF3DE", fg: "#27500A" },
  employee:           { label: "Field Employee", emoji: "🔧", bg: "#E1F5EE", fg: "#085041" },
  government_officer: { label: "Gov. Officer",   emoji: "⚖️", bg: "#FAEEDA", fg: "#854F0B" },
  company_admin:      { label: "Company Admin",  emoji: "💼", bg: "#FAECE7", fg: "#712B13" },
  company_employee:   { label: "Corp. Employee", emoji: "👷", bg: "#E1F5EE", fg: "#085041" },
  super_admin:        { label: "Super Admin",    emoji: "👑", bg: "#FCEBEB", fg: "#791F1F" },
};

interface SettingsUIProps {
  user: any;
  profile: any;
  deptName: string | null;
  roleConfig: any;
  memberSince: string;
}

export default function SettingsUI({ user, profile, deptName, roleConfig, memberSince }: SettingsUIProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(
    profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = fullName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  const roleCfg = ROLE_CONFIG[profile?.role ?? "citizen"] ?? ROLE_CONFIG.citizen;

  async function handleLogout() {
    setLoading(true);
    const result = await signOut();
    if (result?.redirectTo) router.push(result.redirectTo);
  }

  async function handleUpdate() {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("full_name", fullName);
    const res = await updateProfile(formData);
    if (res?.error) {
      setError(res.error);
    } else {
      setIsEditing(false);
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: T.base,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: T.text1,
    }}>
      <style>{`
        .profile-container {
          width: 100%;
          padding: 0 16px calc(90px + env(safe-area-inset-bottom, 0px));
        }
        @media (min-width: 768px) {
          .profile-container {
            max-width: 700px;
            margin: 0 auto;
            padding: 0 32px 90px;
          }
        }
        .profile-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 400px) {
          .profile-info-grid {
            grid-template-columns: 1fr;
          }
        }
        .profile-action-btn {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 18px;
          background: ${T.raised};
          border: none;
          cursor: pointer;
          font-family: inherit;
          text-align: left;
          width: 100%;
          transition: transform 0.1s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .profile-action-btn:active {
          transform: scale(0.98);
        }
      `}</style>

      <div className="profile-container">

        {/* Header */}
        <div style={{ padding: "28px 0 20px" }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 4px", color: T.text1 }}>
            Profile
          </h1>
          <p style={{ fontSize: 13, color: T.text3, margin: 0, fontWeight: 500 }}>
            Manage your account & preferences
          </p>
        </div>

        {/* Error alert */}
        {error && (
          <div style={{
            marginBottom: 20, padding: 14, borderRadius: 14,
            background: "#FCEBEB", border: "1px solid #791F1F30",
            fontSize: 13, color: "#791F1F", fontWeight: 700,
            boxShadow: SH.raisedSm,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Profile Hero Card ── */}
        <div style={{
          borderRadius: 28, marginBottom: 24,
          background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
          boxShadow: `${SH.raised}, 0 8px 32px ${T.accent}40`,
          position: "relative", overflow: "hidden",
        }}>
          {/* Decorative elements */}
          <div style={{ position: "absolute", top: -40, right: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.10)" }} />
          <div style={{ position: "absolute", top: 30, right: 40, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          <div style={{ position: "absolute", bottom: -20, left: -10, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />

          <div style={{ position: "relative", zIndex: 1, padding: "32px 28px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
              {/* Avatar */}
              <div style={{
                width: 76, height: 76, borderRadius: 22, flexShrink: 0,
                background: "rgba(255,255,255,0.18)", border: "2.5px solid rgba(255,255,255,0.30)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, fontWeight: 900, color: "white", letterSpacing: "-0.02em",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                backdropFilter: "blur(10px)",
              }}>
                {initials}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <input
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      autoFocus
                      style={{
                        background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.30)",
                        borderRadius: 12, padding: "10px 14px", color: "white",
                        fontSize: 18, fontWeight: 800, outline: "none", width: "100%",
                        fontFamily: "inherit", backdropFilter: "blur(10px)",
                      }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={handleUpdate}
                        disabled={loading}
                        style={{
                          background: "white", color: T.accent, border: "none",
                          borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 800,
                          cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                          fontFamily: "inherit", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        }}
                      >
                        <Save size={14} /> {loading ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        style={{
                          background: "rgba(255,255,255,0.15)", color: "white", border: "none",
                          borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 800,
                          cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                          fontFamily: "inherit",
                        }}
                      >
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <div style={{
                        fontSize: 22, fontWeight: 900, color: "white",
                        letterSpacing: "-0.03em", overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {fullName}
                      </div>
                      <button
                        onClick={() => setIsEditing(true)}
                        style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "rgba(255,255,255,0.8)", cursor: "pointer", padding: 6, borderRadius: 8 }}
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.email}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Role badge row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                fontSize: 11, fontWeight: 800, padding: "6px 14px", borderRadius: 99,
                background: "rgba(255,255,255,0.20)", color: "white",
                letterSpacing: "0.06em", border: "0.5px solid rgba(255,255,255,0.15)",
                backdropFilter: "blur(6px)",
              }}>
                {roleCfg.emoji} {roleCfg.label.toUpperCase()}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)",
              }}>
                Since {memberSince}
              </span>
            </div>
          </div>
        </div>

        {/* ── Quick Info Cards ── */}
        <div className="profile-info-grid" style={{ marginBottom: 20 }}>
          <InfoTile icon={<Mail size={18} color="#0C447C" />} label="Email" value={user.email ?? "—"} bg="#E6F1FB" />
          <InfoTile icon={<Shield size={18} color={roleCfg.fg} />} label="Role" value={roleCfg.label} bg={roleCfg.bg} />
          {deptName && <InfoTile icon={<Building2 size={18} color="#27500A" />} label="Department" value={deptName} bg="#EAF3DE" />}
          <InfoTile icon={<Calendar size={18} color="#854F0B" />} label="Member Since" value={memberSince} bg="#FAEEDA" />
        </div>

        {/* ── Quick Actions ── */}
        <div style={{
          borderRadius: 24, overflow: "hidden",
          background: T.raised,
          boxShadow: SH.raised,
          marginBottom: 24,
        }}>
          <div style={{
            padding: "14px 20px",
            borderBottom: `1px solid ${T.border}`,
            fontSize: 10, fontWeight: 800, color: T.text3,
            textTransform: "uppercase", letterSpacing: "0.1em",
          }}>
            Quick Actions
          </div>
          
          <ActionRow icon={<FileText size={18} color="#0C447C" />} label="My Reports" subtitle="View all your reported issues" bg="#E6F1FB" onClick={() => router.push('/reports')} />
          <ActionRow icon={<MapPin size={18} color="#27500A" />} label="Nearby Issues" subtitle="Explore issues around you" bg="#EAF3DE" onClick={() => router.push('/reports?tab=nearby')} />
          <ActionRow icon={<Bell size={18} color="#854F0B" />} label="Notifications" subtitle="Manage your alerts" bg="#FAEEDA" onClick={() => router.push('/notifications')} last />
        </div>

        {/* ── Account Security ── */}
        <div style={{
          borderRadius: 24, overflow: "hidden",
          background: T.raised,
          boxShadow: SH.raised,
          marginBottom: 24,
        }}>
          <div style={{
            padding: "14px 20px",
            borderBottom: `1px solid ${T.border}`,
            fontSize: 10, fontWeight: 800, color: T.text3,
            textTransform: "uppercase", letterSpacing: "0.1em",
          }}>
            Account & Security
          </div>
          
          <ActionRow icon={<Lock size={18} color="#3C3489" />} label="Change Password" subtitle="Update your login credentials" bg="#EEEDFE" onClick={() => {}} />
          <ActionRow icon={<Globe size={18} color="#0C447C" />} label="Language" subtitle="English (India)" bg="#E6F1FB" onClick={() => {}} last />
        </div>

        {/* ── Sign Out ── */}
        <button
          onClick={() => { if (confirm("Are you sure you want to sign out?")) handleLogout(); }}
          style={{
            width: "100%", padding: "18px 0", borderRadius: 20,
            background: "#FCEBEB", border: "none",
            color: "#791F1F",
            fontSize: 15, fontWeight: 800, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            letterSpacing: "-0.01em",
            boxShadow: SH.raised,
            fontFamily: "inherit",
            transition: "transform 0.1s ease",
          }}
        >
          <LogOut size={18} />
          Sign Out
        </button>

        {/* Wordmark */}
        <div style={{ textAlign: "center", marginTop: 36, paddingBottom: 20, opacity: 0.25 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: T.text2 }}>CIVIC TRACKER PRO</div>
          <div style={{ fontSize: 10, marginTop: 4, color: T.text3, fontWeight: 500 }}>v1.4.2</div>
        </div>
      </div>
    </div>
  );
}

// ── Info Tile ──────────────────────────────────────────────────────────────────
function InfoTile({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string; bg: string }) {
  return (
    <div style={{
      borderRadius: 20, padding: "18px 16px",
      background: T.raised,
      boxShadow: SH.raised,
      display: "flex", alignItems: "center", gap: 14,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 14, flexShrink: 0,
        background: bg, display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: SH.raisedSm,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      </div>
    </div>
  );
}

// ── Action Row ────────────────────────────────────────────────────────────────
function ActionRow({ icon, label, subtitle, bg, onClick, last }: { icon: React.ReactNode; label: string; subtitle: string; bg: string; onClick: () => void; last?: boolean }) {
  return (
    <button
      className="profile-action-btn"
      onClick={onClick}
      style={{
        borderBottom: last ? "none" : `1px solid ${T.border}`,
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: bg, display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: SH.raisedSm,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text1 }}>{label}</div>
        <div style={{ fontSize: 11, fontWeight: 500, color: T.text3, marginTop: 2 }}>{subtitle}</div>
      </div>
      <ChevronRight size={16} color={T.text3} />
    </button>
  );
}

// ── Section Card helper (kept for backwards compat) ───────────────────────────
function SectionCard({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      borderRadius: 24, overflow: "hidden",
      background: T.raised,
      boxShadow: SH.raised,
      ...style,
    }}>
      <div style={{
        padding: "14px 20px",
        borderBottom: `1px solid ${T.border}`,
        fontSize: 10, fontWeight: 800, color: T.text3,
        textTransform: "uppercase", letterSpacing: "0.1em",
      }}>
        {label}
      </div>
      <div style={{ padding: "0 20px" }}>
        {children}
      </div>
    </div>
  );
}
