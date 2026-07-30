'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/client-actions/auth';
import Link from 'next/link';
import { LogIn, Eye, EyeOff, MapPin, Shield, Zap } from 'lucide-react';
import { QuickLogin } from './QuickLogin';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await signIn(formData);
    if (result?.error) { setError(result.error); setLoading(false); }
    else if (result?.redirectTo) { router.push(result.redirectTo); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "14px 16px", borderRadius: 14, boxSizing: "border-box",
    background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.1)",
    fontSize: 14, color: "white", outline: "none", fontFamily: "inherit",
    transition: "border-color 0.2s",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10,
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0d0d0f",
      fontFamily: "'Inter', -apple-system, sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "24px 16px", color: "white"
    }}>
      {/* Ambient glow */}
      <div style={{ position: "fixed", top: "10%", left: "50%", transform: "translateX(-50%)", width: 500, height: 400, background: "radial-gradient(ellipse, rgba(255, 46, 17, 0.1) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22, margin: "0 auto 20px",
            background: "linear-gradient(135deg, #FF2E11, #A79277)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 12px 36px rgba(255, 46, 17, 0.45)",
          }}>
            <MapPin size={34} color="white" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 6px" }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0, fontWeight: 500 }}>The city is waiting for your report 🏙️</p>
        </div>

        {/* Card */}
        <div style={{
          borderRadius: 24, padding: "32px 24px",
          background: "rgba(255,255,255,0.02)", backdropFilter: "blur(20px)",
          border: "1.5px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
        }}>
          {error && (
            <div style={{ marginBottom: 20, padding: "14px", borderRadius: 14, background: "rgba(239, 68, 68, 0.1)", border: "1.5px solid rgba(239, 68, 68, 0.3)", fontSize: 13, color: "#ef4444", fontWeight: 700 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)); }} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={labelStyle}>Email Address</label>
              <input id="email" name="email" type="email" required autoComplete="email"
                placeholder="you@example.com" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Account Password</label>
              <div style={{ position: "relative" }}>
                <input id="password" name="password" type={showPassword ? 'text' : 'password'}
                  required autoComplete="current-password" placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: 48 }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                  position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", display: "flex",
                }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "16px 0", borderRadius: 16, border: "none",
              background: loading ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #FF2E11, #A79277)",
              color: "white", fontSize: 16, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              boxShadow: loading ? "none" : "0 8px 30px rgba(255, 46, 17, 0.4)",
              marginTop: 6, letterSpacing: "-0.01em", transition: "0.2s"
            }}>
              {loading
                ? <div style={{ width: 22, height: 22, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.8s linear infinite" }} />
                : <><LogIn size={18} /> Sign In</>
              }
            </button>
          </form>
        </div>

        <QuickLogin />

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "rgba(255,255,255,0.3)" }}>
          New to the community?{' '}
          <Link href="/signup" style={{ color: "#FF5E41", fontWeight: 800, textDecoration: "none" }}>Create free account</Link>
        </p>
      </div>

      
    </div>
  );
}
