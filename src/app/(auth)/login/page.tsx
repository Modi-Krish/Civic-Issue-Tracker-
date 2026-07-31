'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginWithEmail } from '@/lib/client-actions/auth';
import { 
  MapPin, 
  Shield, 
  Award, 
  Wrench, 
  Zap, 
  Building2, 
  Briefcase, 
  User, 
  ArrowRight,
  Loader2
} from 'lucide-react';

interface SeededUser {
  email: string;
  roleName: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

const SEED_USERS: SeededUser[] = [
  {
    email: 'superadmincivictracker@gmail.com',
    roleName: 'Super Admin',
    description: 'System dashboard, user approvals, master platform logs.',
    icon: Shield,
    color: '#ef4444',
  },
  {
    email: 'govofficercivictracker@gmail.com',
    roleName: 'Government Officer',
    description: 'Oversees city issues, issues tenders, approves final contractor works.',
    icon: Award,
    color: '#f59e0b',
  },
  {
    email: 'roadcivictracker@gmail.com',
    roleName: 'Road Dept Admin',
    description: 'Monitors road damage, creates tenders, manages road department budget.',
    icon: Wrench,
    color: '#3b82f6',
  },
  {
    email: 'electricitycivictracker@gmail.com',
    roleName: 'Electricity Dept Admin',
    description: 'Monitors power-line issues, manages local power grid issues and tenders.',
    icon: Zap,
    color: '#eab308',
  },
  {
    email: 'companyadmincivictracker@gmail.com',
    roleName: 'Company Admin',
    description: 'Submits bids for open tenders, assigns employees to active repair projects.',
    icon: Building2,
    color: '#a855f7',
  },
  {
    email: 'companyemployeecivictracker@gmail.com',
    roleName: 'Company Employee',
    description: 'Completes physical repairs, uploads before/after proofs, updates statuses.',
    icon: Briefcase,
    color: '#ec4899',
  },
  {
    email: 'citizencivictracker@gmail.com',
    roleName: 'Citizen',
    description: 'Reports civic issues, tracks real-time progress, rates repair quality.',
    icon: User,
    color: '#10b981',
  },
];

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const router = useRouter();

  async function handleQuickLogin(email: string) {
    if (loadingEmail) return;
    setLoadingEmail(email);
    setError(null);

    try {
      const result = await loginWithEmail(email);
      if (result?.error) {
        setError(result.error);
        setLoadingEmail(null);
      } else if (result?.redirectTo) {
        router.push(result.redirectTo);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during login.');
      setLoadingEmail(null);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", 
      background: "#0d0d0f",
      fontFamily: "'Inter', -apple-system, sans-serif",
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      padding: "60px 20px", 
      color: "white",
      boxSizing: "border-box"
    }}>
      {/* Ambient background glows */}
      <div style={{ position: "fixed", top: "-10%", left: "20%", width: 600, height: 600, background: "radial-gradient(circle, rgba(255, 46, 17, 0.08) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-10%", right: "20%", width: 600, height: 600, background: "radial-gradient(circle, rgba(167, 146, 119, 0.06) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 1100, position: "relative", zIndex: 1 }}>
        
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{
            width: 64, 
            height: 64, 
            borderRadius: 20, 
            margin: "0 auto 20px",
            background: "linear-gradient(135deg, #FF2E11, #A79277)",
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            boxShadow: "0 12px 36px rgba(255, 46, 17, 0.4)",
          }}>
            <MapPin size={30} color="white" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 10px" }}>
            Civic Issue Tracker
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", margin: 0, fontWeight: 500 }}>
            Select a seeded user profile below to log in instantly 🚀
          </p>
        </div>

        {error && (
          <div style={{ 
            maxWidth: 600,
            margin: "0 auto 30px",
            padding: "16px", 
            borderRadius: 16, 
            background: "rgba(239, 68, 68, 0.1)", 
            border: "1.5px solid rgba(239, 68, 68, 0.25)", 
            fontSize: 14, 
            color: "#ef4444", 
            fontWeight: 600,
            textAlign: "center"
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Roles Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 20,
          width: "100%",
          boxSizing: "border-box"
        }}>
          {SEED_USERS.map((user) => {
            const IconComponent = user.icon;
            const isThisLoading = loadingEmail === user.email;
            const isAnyLoading = loadingEmail !== null;

            return (
              <div
                key={user.email}
                onClick={() => handleQuickLogin(user.email)}
                style={{
                  borderRadius: 22,
                  padding: "26px 24px",
                  background: isThisLoading ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                  backdropFilter: "blur(20px)",
                  border: isThisLoading 
                    ? `1.5px solid ${user.color}` 
                    : "1.5px solid rgba(255,255,255,0.06)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                  cursor: isAnyLoading ? "not-allowed" : "pointer",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  opacity: isAnyLoading && !isThisLoading ? 0.4 : 1,
                  transform: isThisLoading ? "scale(0.98)" : "none",
                  position: "relative",
                  overflow: "hidden"
                }}
                onMouseEnter={(e) => {
                  if (!isAnyLoading) {
                    e.currentTarget.style.border = `1.5px solid ${user.color}80`;
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = `0 12px 40px ${user.color}15`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isAnyLoading) {
                    e.currentTarget.style.border = "1.5px solid rgba(255,255,255,0.06)";
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.2)";
                  }
                }}
              >
                {/* Glow hint */}
                <div style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 80,
                  height: 80,
                  background: `radial-gradient(circle, ${user.color}12 0%, transparent 70%)`,
                  borderRadius: "50%",
                  pointerEvents: "none"
                }} />

                <div>
                  {/* Top: Icon & Role Name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: `${user.color}15`,
                      border: `1px solid ${user.color}30`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: user.color
                    }}>
                      <IconComponent size={22} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
                        {user.roleName}
                      </h2>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>
                        {user.email}
                      </span>
                    </div>
                  </div>

                  {/* Body: Description */}
                  <p style={{ 
                    fontSize: 13, 
                    color: "rgba(255,255,255,0.55)", 
                    lineHeight: "1.5", 
                    margin: "0 0 24px",
                    fontWeight: 450
                  }}>
                    {user.description}
                  </p>
                </div>

                {/* Bottom Action Area */}
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between",
                  borderTop: "1px solid rgba(255,255,255,0.04)",
                  paddingTop: 16,
                  marginTop: "auto"
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: user.color, letterSpacing: "0.02em" }}>
                    {isThisLoading ? "LOGGING IN..." : "LAUNCH DASHBOARD"}
                  </span>
                  <div>
                    {isThisLoading ? (
                      <Loader2 
                        size={16} 
                        color={user.color} 
                        style={{ animation: "spin 1s linear infinite" }} 
                      />
                    ) : (
                      <ArrowRight size={16} color="rgba(255,255,255,0.3)" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
