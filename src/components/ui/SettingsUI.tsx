'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile, signOut } from '@/lib/client-actions/auth';
import { User, Shield, LogOut, Mail, Building2, Calendar, ChevronRight, Bell, HelpCircle, Star, Palette, Save, X, Edit2 } from 'lucide-react';
type SupabaseUser = any;

interface SettingsUIProps {
  user: SupabaseUser;
  profile: any;
  deptName: string | null;
  roleConfig: any;
  memberSince: string;
}

export default function SettingsUI({ user, profile, deptName, roleConfig, memberSince }: SettingsUIProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = fullName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  async function handleLogout() {
    setLoading(true);
    const result = await signOut();
    if (result?.redirectTo) router.push(result.redirectTo);
  }

  async function handleUpdate() {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('full_name', fullName);
    
    const res = await updateProfile(formData);
    if (res?.error) {
      setError(res.error);
    } else {
      setIsEditing(false);
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0f", fontFamily: "'Inter', -apple-system, sans-serif", color: "#ffffff", paddingBottom: 100 }}>
      {/* ambient */}
       <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -80, right: "10%", width: 340, height: 260, background: "radial-gradient(ellipse, rgba(255, 46, 17, 0.06) 0%, transparent 70%)", borderRadius: "50%" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 480, margin: "0 auto", padding: "0 16px" }}>

        {/* Header */}
        <div style={{ padding: "28px 0 24px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 4px" }}>Settings</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0, fontWeight: 500 }}>Global Preferences & Account</p>
        </div>

        {/* Error alert */}
        {error && (
          <div style={{ marginBottom: 20, padding: "14px", borderRadius: 14, background: "rgba(239, 68, 68, 0.1)", border: "1.5px solid rgba(239, 68, 68, 0.3)", fontSize: 13, color: "#ef4444", fontWeight: 700 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Profile Hero */}
        <div style={{
          borderRadius: 24, padding: "28px", marginBottom: 20,
          background: "linear-gradient(135deg, #FF2E11 0%, #A79277 100%)",
          boxShadow: "0 12px 40px rgba(255, 46, 17, 0.4)", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -30, right: -20, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />
          
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{
              width: 68, height: 68, borderRadius: 20, flexShrink: 0,
              background: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, fontWeight: 900, color: "white", letterSpacing: "-0.02em",
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {isEditing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)}
                    autoFocus
                    style={{
                      background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)",
                      borderRadius: 8, padding: "4px 10px", color: "white", fontSize: 18, fontWeight: 800,
                      outline: "none", width: "100%"
                    }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button 
                      onClick={handleUpdate} 
                      disabled={loading}
                      style={{ background: "white", color: "#FF2E11", border: "none", borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <Save size={14} /> {loading ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)} 
                      style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "none", borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "white", letterSpacing: "-0.03em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {fullName}
                    </div>
                    <button onClick={() => setIsEditing(true)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", padding: 4 }}>
                      <Edit2 size={16} />
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.email}
                  </div>
                </>
              )}
              <span style={{
                fontSize: 10, fontWeight: 800, padding: "5px 12px", borderRadius: 99,
                background: "rgba(255,255,255,0.2)", color: "white", letterSpacing: "0.06em", border: "0.5px solid rgba(255,255,255,0.15)"
              }}>
                {roleConfig.emoji} {roleConfig.label?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Account Group */}
        <div style={{ borderRadius: 24, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 20, background: "rgba(255,255,255,0.02)" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Account Identification
          </div>
          {[
            { icon: Mail, label: "Email Address", value: user.email || "—", color: "#60a5fa" },
            { icon: Shield, label: "Access Level", value: `${roleConfig.emoji} ${roleConfig.label}`, color: "#FF2E11" },
            ...(deptName ? [{ icon: Building2, label: "Assigned Unit", value: deptName, color: "#10b981" }] : []),
            { icon: Calendar, label: "Citizen Join Date", value: memberSince, color: "#fbbf24" },
          ].map(({ icon: Icon, label, value, color }, i, arr) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 16, padding: "16px 18px",
              borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={16} color={color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Preferences Group */}
        <div style={{ borderRadius: 24, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 24, background: "rgba(255,255,255,0.02)" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Experience Settings
          </div>
          {[
            { icon: Palette,      label: "Visual Theme",  value: "Warm Energy", color: "#FF2E11" },
            { icon: Bell,        label: "Push Alerts",    value: "All Enabled",    color: "#fbbf24" },
            { icon: Star,        label: "Achievement",    value: "1,240 XP",       color: "#10b981" },
            { icon: HelpCircle,  label: "Citizen Help",   value: "Support Hub",    color: "#60a5fa" },
          ].map(({ icon: Icon, label, value, color }, i, arr) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 16, padding: "16px 18px",
              borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              cursor: "pointer", transition: "0.15s"
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={16} color={color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{label}</div>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                {value}
                <ChevronRight size={14} color="rgba(255,255,255,0.2)" />
              </div>
            </div>
          ))}
        </div>

        {/* Logout Zone */}
        <button onClick={() => { if(confirm('Are you sure you want to sign out?')) handleLogout() }} style={{
          width: "100%", padding: "18px 0", borderRadius: 20, border: "1.5px solid rgba(239, 68, 68, 0.25)",
          background: "rgba(239, 68, 68, 0.05)", color: "#ef4444",
          fontSize: 15, fontWeight: 800, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          letterSpacing: "-0.01em", transition: "0.2s"
        }}>
          <LogOut size={18} />
          Sign Out Securely
        </button>

        <div style={{ textAlign: "center", marginTop: 28, opacity: 0.2 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}>CIVIC TRACKER PRO</div>
            <div style={{ fontSize: 10, marginTop: 4 }}>STABLE BUILD v1.4.2</div>
        </div>
      </div>
    </div>
  );
}
