'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signUp } from '@/lib/client-actions/auth';
import Link from 'next/link';
import { UserPlus, Eye, EyeOff, MapPin, User, Shield, Briefcase } from 'lucide-react';

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  // Seed departments as instant fallback (matches migration.sql seed data)
  const SEED_DEPARTMENTS = [
    { id: 'drainage',    name: 'Drainage' },
    { id: 'electricity', name: 'Electricity' },
    { id: 'roads',       name: 'Roads' },
    { id: 'sanitation',  name: 'Sanitation' },
    { id: 'water',       name: 'Water Supply' },
  ];
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>(SEED_DEPARTMENTS);
  const [selectedRole, setSelectedRole] = useState("citizen");

  useEffect(() => {
    async function fetchDepts() {
      try {
        const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const q = query(collection(db, 'departments'), orderBy('name'));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, name: d.data().name }));
        if (data && data.length > 0) {
          setDepartments(data);
        }
      } catch {}
    }
    fetchDepts();
  }, []);

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

  const roles = [
    { value: "citizen", label: "Citizen", icon: User, desc: "Report local issues in your area" },
    { value: "department_admin", label: "Dept. Admin", icon: Shield, desc: "Manage and assign department issues" },
    { value: "employee", label: "Field Staff", icon: Briefcase, desc: "Resolve assigned ground tasks" },
  ];

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await signUp(formData);
    if (result?.error) { setError(result.error); setLoading(false); }
    else if (result?.redirectTo) { router.push(result.redirectTo); }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#0d0d0f",
      fontFamily: "'Inter', -apple-system, sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "40px 16px", color: "white"
    }}>
      {/* Ambient glow */}
      <div style={{ position: "fixed", top: "5%", left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(255, 46, 17, 0.1) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22, margin: "0 auto 18px",
            background: "linear-gradient(135deg, #FF2E11, #A79277)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 12px 36px rgba(255, 46, 17, 0.45)",
          }}>
             <MapPin size={34} color="white" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 6px" }}>
            Create Account
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0, fontWeight: 500 }}>Join the community building better cities 🌆</p>
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
              <label style={labelStyle}>Full Name</label>
              <input id="full_name" name="full_name" type="text" required placeholder="John Doe" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Email Address</label>
              <input id="email" name="email" type="email" required autoComplete="email"
                placeholder="you@example.com" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Access Password</label>
              <div style={{ position: "relative" }}>
                <input id="password" name="password" type={showPassword ? 'text' : 'password'}
                  required minLength={6} autoComplete="new-password" placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: 48 }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                  position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", display: "flex",
                }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Role picker and Department Picker have been removed for security reasons. Only admins can create staff accounts. */}

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "18px 0", borderRadius: 18, border: "none",
              background: loading ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #FF2E11, #A79277)",
              color: "white", fontSize: 16, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              boxShadow: loading ? "none" : "0 8px 30px rgba(255, 46, 17, 0.4)",
              marginTop: 10, transition: "0.2s"
            }}>
              {loading
                ? <div className="animate-spin" style={{ width: 22, height: 22, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.2)", borderTopColor: "white" }} />
                : <><UserPlus size={18} /> Join CivicTracker</>
              }
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "rgba(255,255,255,0.3)" }}>
          Already part of the community?{' '}
          <Link href="/login" style={{ color: "#FF5E41", fontWeight: 800, textDecoration: "none" }}>Sign in here</Link>
        </p>
      </div>
    </div>
  );
}
