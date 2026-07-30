"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

function useCount(target: number, duration: number = 1600) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(ease * target));
      if (p < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function StatCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const val = useCount(target);
  return <>{val.toLocaleString()}{suffix}</>;
}

const FEATURES = [
  {
    emoji: "📸", accent: "#FF2E11", bg: "#3d1a15", border: "rgba(255, 46, 17, 0.18)",
    title: "Snap & Report", badge: "2 min avg",
    body: "Take a photo of any civic issue and submit a report in under 2 minutes.",
  },
  {
    emoji: "📍", accent: "#f59e0b", bg: "#3a2a0a", border: "rgba(245,158,11,0.18)",
    title: "Track Progress", badge: "Real-time",
    body: "Follow your issue from report to resolution with a full live status timeline.",
  },
  {
    emoji: "🏆", accent: "#34d399", bg: "#1a3a2a", border: "rgba(52,211,153,0.18)",
    title: "Earn Rewards", badge: "Verified",
    body: "Get reward points for genuine reports after verified resolution.",
  },
];

const HOW_IT_WORKS = [
  { step: "01", emoji: "👀", title: "Spot an issue",  desc: "See a pothole, broken light, or graffiti? Open the app." },
  { step: "02", emoji: "📷", title: "Snap & submit",  desc: "Take a photo, add a location, and file the report in seconds." },
  { step: "03", emoji: "🔄", title: "We track it",    desc: "Your report is assigned to the relevant department automatically." },
  { step: "04", emoji: "✅", title: "City fixes it",  desc: "The issue is resolved and you earn points for your contribution." },
];

function Navbar({ user }: { user: any }) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: "calc(58px + env(safe-area-inset-top, 0px))",
        paddingTop: "env(safe-area-inset-top, 0px)",
        background: scrolled || menuOpen ? "rgba(13,13,15,0.97)" : "transparent",
        backdropFilter: scrolled || menuOpen ? "blur(20px)" : "none",
        borderBottom: scrolled || menuOpen ? "0.5px solid rgba(255,255,255,0.08)" : "none",
        transition: "background 0.3s",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingLeft: 16, paddingRight: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: "linear-gradient(135deg, #FF2E11, #A79277)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 12px rgba(255, 46, 17, 0.5)",
          }}>
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L3 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-4z" fill="white" opacity="0.92"/>
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.03em", color: "#fff" }}>CivicTracker</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {user ? (
            <button onClick={() => router.push("/dashboard")} style={{
              padding: "7px 14px", borderRadius: 9, fontSize: 13, fontWeight: 700,
              background: "linear-gradient(135deg, #FF2E11, #A79277)", border: "none",
              color: "white", cursor: "pointer",
            }}>Dashboard</button>
          ) : (
            <button onClick={() => router.push("/login")} style={{
              padding: "7px 14px", borderRadius: 9, fontSize: 13, fontWeight: 700,
              background: "rgba(255,255,255,0.07)", border: "0.5px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.85)", cursor: "pointer",
            }}>Sign in</button>
          )}
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4.5, cursor: "pointer" }}
          >
            {[0,1,2].map(i => (
              <div key={i} style={{ width: menuOpen ? (i===1?0:18) : 18, height: 1.5, borderRadius: 99, background: "rgba(255,255,255,0.7)", transition: "width 0.2s" }} />
            ))}
          </button>
        </div>
      </nav>
      {menuOpen && (
        <div style={{
          position: "fixed", top: "calc(58px + env(safe-area-inset-top, 0px))", left: 0, right: 0, zIndex: 99,
          background: "rgba(13,13,15,0.98)", backdropFilter: "blur(20px)",
          borderBottom: "0.5px solid rgba(255,255,255,0.08)",
          padding: "12px 16px 20px",
        }}>
          {["Features", "How it works", "Rewards"].map(l => (
            <div key={l} onClick={() => setMenuOpen(false)} style={{ padding: "13px 4px", fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.7)", borderBottom: "0.5px solid rgba(255,255,255,0.05)", cursor: "pointer" }}>{l}</div>
          ))}
          {!user && (
            <button onClick={() => router.push("/signup")} style={{
              marginTop: 16, width: "100%", padding: "14px", borderRadius: 12,
              background: "linear-gradient(135deg, #FF2E11, #A79277)",
              border: "none", color: "white", fontSize: 15, fontWeight: 800, cursor: "pointer",
              boxShadow: "0 8px 24px rgba(255, 46, 17, 0.4)",
            }}>Get Started — it's free →</button>
          )}
        </div>
      )}
    </>
  );
}

interface LandingUIProps {
  user: any;
  stats: {
    resolved: number;
    citizens: number;
    successRate: number;
  }
}

export default function LandingUI({ user, stats }: LandingUIProps) {
  const router = useRouter();
  return (
    <div style={{
      minHeight: "100vh", background: "#0d0d0f",
      fontFamily: "'Inter', -apple-system, sans-serif", color: "#fff",
      overflowX: "hidden",
    }}>
      <Navbar user={user} />

      <section style={{
        position: "relative", minHeight: "100svh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "88px 20px 72px", textAlign: "center",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "8%", left: "50%", transform: "translateX(-50%)", width: 500, height: 400, background: "radial-gradient(ellipse, rgba(255, 46, 17, 0.22) 0%, transparent 65%)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", bottom: "5%", right: "-10%", width: 300, height: 300, background: "radial-gradient(ellipse, rgba(167, 146, 119, 0.12) 0%, transparent 70%)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", top: "40%", left: "-10%", width: 240, height: 240, background: "radial-gradient(ellipse, rgba(16, 185, 129, 0.08) 0%, transparent 70%)", borderRadius: "50%" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "50px 50px", pointerEvents: "none", maskImage: "radial-gradient(ellipse at 50% 40%, black 10%, transparent 75%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 10%, transparent 75%)" }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 480, width: "100%" }}>
          <div style={{
            width: 76, height: 76, borderRadius: 22, margin: "0 auto 22px",
            background: "linear-gradient(135deg, #FF2E11 0%, #A79277 55%, #C5B49C 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 40px rgba(255, 46, 17, 0.55), 0 0 80px rgba(255, 46, 17, 0.2), 0 0 0 1px rgba(167, 146, 119, 0.35)",
          }}>
            <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
              <path d="M20 4L6 11v10c0 9 6 15 14 18 8-3 14-9 14-18V11L20 4z" fill="white" opacity="0.92"/>
            </svg>
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            marginBottom: 20, padding: "5px 14px", borderRadius: 99,
            background: "rgba(255, 46, 17, 0.15)", border: "0.5px solid rgba(167, 146, 119, 0.4)",
            fontSize: 12, fontWeight: 700, color: "#C5B49C", letterSpacing: "0.04em",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#A79277", boxShadow: "0 0 6px #A79277", animation: "pulse 2s infinite" }} />
            Now live in your city
          </div>
          <h1 style={{
            fontSize: "clamp(36px, 10vw, 56px)", fontWeight: 900,
            letterSpacing: "-0.04em", lineHeight: 1.07, margin: "0 0 18px",
          }}>
            Take care of{" "}
            <span style={{ background: "linear-gradient(135deg, #FF5E41, #FF2E11, #A79277)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              your city
            </span>
          </h1>
          <p style={{
            fontSize: 16, color: "rgba(255,255,255,0.48)", lineHeight: 1.7,
            margin: "0 0 32px", fontWeight: 400, maxWidth: 340, marginLeft: "auto", marginRight: "auto",
          }}>
            Report civic issues, track repairs in real time, and earn rewards for making your neighborhood better.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 44 }}>
            <button onClick={() => router.push("/signup")} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "15px 24px", borderRadius: 14, fontSize: 15, fontWeight: 800,
              background: "linear-gradient(135deg, #FF2E11, #A79277)",
              border: "none", color: "white", cursor: "pointer", width: "100%",
              boxShadow: "0 8px 28px rgba(255, 46, 17, 0.5), 0 0 0 1px rgba(167, 146, 119, 0.3)",
            }}>
              Get Started — it's free
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button onClick={() => router.push("/login")} style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "14px 24px", borderRadius: 14, fontSize: 15, fontWeight: 700,
              background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.13)",
              color: "rgba(255,255,255,0.75)", cursor: "pointer", width: "100%",
            }}>
              Sign in
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
            {[
              { target: stats.resolved, suffix: "", label: "Resolved" },
              { target: stats.citizens,  suffix: "", label: "Citizens" },
              { target: stats.successRate,    suffix: "%", label: "Success rate" },
            ].map(({ target, suffix, label }, i) => (
              <div key={label} style={{
                textAlign: "center", padding: "16px 8px",
                borderLeft: i > 0 ? "0.5px solid rgba(255,255,255,0.08)" : "none",
              }}>
                <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", lineHeight: 1 }}>
                  <StatCounter target={target} suffix={suffix} />
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.32)", marginTop: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, opacity: 0.25 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Scroll</span>
          <svg width="14" height="20" viewBox="0 0 14 20" fill="none"><rect x="5" y="2" width="4" height="6" rx="2" fill="white"/><rect x="0.5" y="0.5" width="13" height="19" rx="6.5" stroke="white" strokeOpacity="0.5"/></svg>
        </div>
      </section>

      <section style={{ padding: "72px 20px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12 }}>Features</div>
          <h2 style={{ fontSize: "clamp(26px, 7vw, 40px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.12, margin: 0 }}>
            Everything you need<br/>
            <span style={{ color: "rgba(255,255,255,0.38)" }}>to fix your city</span>
          </h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480, margin: "0 auto" }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              borderRadius: 20, padding: "22px 20px",
              background: `${f.bg}aa`, border: `0.5px solid ${f.border}`,
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", bottom: -6, right: 10, fontSize: 64, opacity: 0.07, lineHeight: 1 }}>{f.emoji}</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 14, padding: "3px 10px", borderRadius: 99, background: `${f.accent}18`, border: `0.5px solid ${f.accent}28` }}>
                <span style={{ fontSize: 13 }}>{f.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: f.accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>{f.badge}</span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff", margin: "0 0 8px" }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.48)", lineHeight: 1.65, margin: 0 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "0 20px 72px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12 }}>Process</div>
          <h2 style={{ fontSize: "clamp(26px, 7vw, 40px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.12, margin: 0 }}>
            From spot to fixed<br/>
            <span style={{ color: "rgba(255,255,255,0.38)" }}>in four steps</span>
          </h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: 400, margin: "0 auto" }}>
          {HOW_IT_WORKS.map((item, i) => (
            <div key={item.step} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 16, flexShrink: 0,
                  background: i === 1 ? "linear-gradient(135deg, #FF2E11, #A79277)" : "rgba(255,255,255,0.05)",
                  border: i === 1 ? "none" : "0.5px solid rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: i === 1 ? "0 6px 20px rgba(255, 46, 17, 0.4)" : "none",
                  fontSize: 20,
                }}>
                  <span>{item.emoji}</span>
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div style={{ width: 1.5, height: 32, background: "rgba(255,255,255,0.07)", margin: "6px 0" }} />
                )}
              </div>
              <div style={{ paddingTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: i === 1 ? "#FF5E41" : "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{item.step}</span>
                  <h4 style={{ fontSize: 15, fontWeight: 800, color: i === 1 ? "#fff" : "rgba(255,255,255,0.8)", margin: 0, letterSpacing: "-0.01em" }}>{item.title}</h4>
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", lineHeight: 1.6, margin: "0 0 6px" }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "0 20px 80px" }}>
        <div style={{
          borderRadius: 24, padding: "44px 24px", textAlign: "center",
          background: "linear-gradient(135deg, rgba(255, 46, 17, 0.22) 0%, rgba(167, 146, 119, 0.09) 100%)",
          border: "1px solid rgba(167, 146, 119, 0.22)", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)", width: 300, height: 220, background: "radial-gradient(ellipse, rgba(255, 46, 17, 0.3) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>🏙️</div>
            <h2 style={{ fontSize: "clamp(22px, 6vw, 34px)", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 12px" }}>Your city needs you</h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.48)", lineHeight: 1.65, margin: "0 auto 28px", maxWidth: 280 }}>
              Join thousands of citizens making their neighborhoods better — one report at a time.
            </p>
            <button onClick={() => router.push("/signup")} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "14px 0", borderRadius: 13, fontSize: 15, fontWeight: 800,
              background: "linear-gradient(135deg, #FF2E11, #A79277)",
              border: "none", color: "white", cursor: "pointer", width: "100%", maxWidth: 320, margin: "0 auto",
              boxShadow: "0 8px 28px rgba(255, 46, 17, 0.45)",
            }}>
              Start reporting now
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)", padding: "24px 20px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: "linear-gradient(135deg, #FF2E11, #A79277)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M10 2L3 6v5c0 4.5 6 9 7 9s7-4.5 7-9V6l-7-4z" fill="white" opacity="0.9"/></svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.45)" }}>CivicTracker © 2026</span>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {["Privacy", "Terms", "Contact"].map(l => (
            <span key={l} style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.28)", cursor: "pointer" }}>{l}</span>
          ))}
        </div>
      </footer>

    </div>
  );
}
