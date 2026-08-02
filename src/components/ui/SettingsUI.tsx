"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, signOut } from "@/lib/client-actions/auth";
import {
  User, Shield, LogOut, Mail, Building2, Calendar,
  ChevronRight, Bell, HelpCircle, Star, Palette,
  Save, X, Edit2,
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
      paddingBottom: 100,
    }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px" }}>

        {/* Header */}
        <div style={{ padding: "28px 0 24px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 4px", color: T.text1 }}>
            Settings
          </h1>
          <p style={{ fontSize: 13, color: T.text3, margin: 0, fontWeight: 500 }}>
            Global Preferences & Account
          </p>
        </div>

        {/* Error alert */}
        {error && (
          <div style={{
            marginBottom: 20, padding: 14, borderRadius: 14,
            background: "#FCEBEB", border: `1px solid #791F1F30`,
            fontSize: 13, color: "#791F1F", fontWeight: 700,
            boxShadow: SH.raisedSm,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Profile Hero */}
        <div style={{
          borderRadius: 28, padding: "28px", marginBottom: 20,
          background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
          boxShadow: `${SH.raised}, 0 8px 32px ${T.accent}40`,
          position: "relative", overflow: "hidden",
        }}>
          {/* decorative circles */}
          <div style={{ position: "absolute", top: -30, right: -20, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />
          <div style={{ position: "absolute", bottom: -20, left: 20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />

          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 18 }}>
            {/* Avatar */}
            <div style={{
              width: 68, height: 68, borderRadius: 20, flexShrink: 0,
              background: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, fontWeight: 900, color: "white", letterSpacing: "-0.02em",
              boxShadow: `4px 4px 12px rgba(0,0,0,0.2)`,
            }}>
              {initials}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {isEditing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    autoFocus
                    style={{
                      background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)",
                      borderRadius: 10, padding: "6px 12px", color: "white",
                      fontSize: 18, fontWeight: 800, outline: "none", width: "100%",
                      fontFamily: "inherit",
                    }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={handleUpdate}
                      disabled={loading}
                      style={{
                        background: "white", color: T.accent, border: "none",
                        borderRadius: 8, padding: "5px 14px", fontSize: 12, fontWeight: 800,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                        fontFamily: "inherit",
                      }}
                    >
                      <Save size={13} /> {loading ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      style={{
                        background: "rgba(255,255,255,0.2)", color: "white", border: "none",
                        borderRadius: 8, padding: "5px 14px", fontSize: 12, fontWeight: 800,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                        fontFamily: "inherit",
                      }}
                    >
                      <X size={13} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <div style={{
                      fontSize: 20, fontWeight: 900, color: "white",
                      letterSpacing: "-0.03em", overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {fullName}
                    </div>
                    <button
                      onClick={() => setIsEditing(true)}
                      style={{ background: "none", border: "none", color: "rgba(255,255,255,0.65)", cursor: "pointer", padding: 4 }}
                    >
                      <Edit2 size={15} />
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.email}
                  </div>
                </>
              )}
              {/* Role badge */}
              <span style={{
                fontSize: 10, fontWeight: 800, padding: "5px 12px", borderRadius: 99,
                background: "rgba(255,255,255,0.22)", color: "white",
                letterSpacing: "0.06em", border: "0.5px solid rgba(255,255,255,0.18)",
              }}>
                {roleCfg.emoji} {roleCfg.label.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Account Section */}
        <SectionCard label="Account Identification" style={{ marginBottom: 20 }}>
          {[
            { icon: Mail,      label: "Email Address",    value: user.email ?? "—",                        bg: "#E6F1FB", fg: "#0C447C" },
            { icon: Shield,    label: "Access Level",     value: `${roleCfg.emoji} ${roleCfg.label}`,      bg: roleCfg.bg, fg: roleCfg.fg },
            ...(deptName ? [{ icon: Building2, label: "Assigned Unit", value: deptName, bg: "#EAF3DE", fg: "#27500A" }] : []),
            { icon: Calendar,  label: "Member Since",     value: memberSince,                               bg: "#FAEEDA", fg: "#854F0B" },
          ].map(({ icon: Icon, label, value, bg, fg }, i, arr) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 0",
              borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : "none",
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                background: bg, display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: SH.raisedSm,
              }}>
                <Icon size={16} color={fg} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: T.text3, fontWeight: 600, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
              </div>
            </div>
          ))}
        </SectionCard>

        {/* Preferences Section */}
        <SectionCard label="Experience Settings" style={{ marginBottom: 24 }}>
          {[
            { icon: Palette,    label: "Visual Theme",  value: "Warm Light",   bg: "#FAECE7", fg: "#712B13" },
            { icon: Bell,       label: "Push Alerts",   value: "All Enabled",  bg: "#FAEEDA", fg: "#854F0B" },
            { icon: Star,       label: "Achievement",   value: "1,240 XP",     bg: "#EAF3DE", fg: "#27500A" },
            { icon: HelpCircle, label: "Citizen Help",  value: "Support Hub",  bg: "#E6F1FB", fg: "#0C447C" },
          ].map(({ icon: Icon, label, value, bg, fg }, i, arr) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 0",
              borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : "none",
              cursor: "pointer",
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                background: bg, display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: SH.raisedSm,
              }}>
                <Icon size={16} color={fg} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text1 }}>{label}</div>
              </div>
              <div style={{ fontSize: 11, color: T.text3, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                {value}
                <ChevronRight size={14} color={T.text3} />
              </div>
            </div>
          ))}
        </SectionCard>

        {/* Logout */}
        <button
          onClick={() => { if (confirm("Are you sure you want to sign out?")) handleLogout(); }}
          style={{
            width: "100%", padding: "17px 0", borderRadius: 20,
            background: "#FCEBEB", border: "none",
            color: "#791F1F",
            fontSize: 15, fontWeight: 800, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            letterSpacing: "-0.01em",
            boxShadow: SH.raised,
            fontFamily: "inherit",
          }}
        >
          <LogOut size={18} />
          Sign Out Securely
        </button>

        {/* Wordmark */}
        <div style={{ textAlign: "center", marginTop: 32, opacity: 0.3 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: T.text2 }}>CIVIC TRACKER PRO</div>
          <div style={{ fontSize: 10, marginTop: 4, color: T.text3 }}>STABLE BUILD v1.4.2</div>
        </div>
      </div>
    </div>
  );
}

// ── Section Card helper ───────────────────────────────────────────────────────
function SectionCard({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  const T2 = { raised: "#F5F3EC", border: "#DDD9CE", text3: "#888780", shD: "rgba(0,0,0,0.09)", shL: "rgba(255,255,255,0.75)" };
  return (
    <div style={{
      borderRadius: 24, overflow: "hidden",
      background: T2.raised,
      boxShadow: `8px 8px 16px ${T2.shD}, -8px -8px 16px ${T2.shL}`,
      ...style,
    }}>
      <div style={{
        padding: "12px 18px",
        borderBottom: `1px solid ${T2.border}`,
        fontSize: 10, fontWeight: 800, color: T2.text3,
        textTransform: "uppercase", letterSpacing: "0.1em",
      }}>
        {label}
      </div>
      <div style={{ padding: "0 18px" }}>
        {children}
      </div>
    </div>
  );
}
