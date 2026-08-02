"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Camera,
  Navigation2,
  Star,
  Eye,
  RefreshCw,
  CheckCircle,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens — neomorphism-lite (identical to auth page + SettingsPage)
// ---------------------------------------------------------------------------
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
  dept: {
    roads: { bg: "#E6F1FB", fg: "#0C447C" },
    elec:  { bg: "#FAEEDA", fg: "#854F0B" },
    fire:  { bg: "#FCEBEB", fg: "#791F1F" },
    water: { bg: "#EAF3DE", fg: "#27500A" },
    san:   { bg: "#FAECE7", fg: "#712B13" },
    parks: { bg: "#EEEDFE", fg: "#3C3489" },
  },
} as const;

const SH = {
  raised:    `8px 8px 16px ${T.shD}, -8px -8px 16px ${T.shL}`,
  raisedSm:  `4px 4px 8px ${T.shD}, -4px -4px 8px ${T.shL}`,
  inset:     `inset 5px 5px 10px ${T.shD}, inset -5px -5px 10px ${T.shL}`,
  insetSoft: `inset 3px 3px 7px ${T.shD}, inset -3px -3px 7px ${T.shL}`,
};

// ---------------------------------------------------------------------------
// Animated counter hook — preserved from original
// ---------------------------------------------------------------------------
function useCount(target: number, duration = 1600) {
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

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------
type DeptKey = keyof typeof T.dept;

interface Feature {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  dept: DeptKey;
  title: string;
  badge: string;
  body: string;
}

interface Step {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  step: string;
  title: string;
  desc: string;
}

const FEATURES: Feature[] = [
  {
    icon: Camera,
    dept: "fire",
    title: "Snap & Report",
    badge: "2 min avg",
    body: "Take a photo of any civic issue and submit a report in under 2 minutes.",
  },
  {
    icon: Navigation2,
    dept: "roads",
    title: "Track Progress",
    badge: "Real-time",
    body: "Follow your issue from report to resolution with a full live status timeline.",
  },
  {
    icon: Star,
    dept: "water",
    title: "Earn Rewards",
    badge: "Verified",
    body: "Get reward points for genuine reports after verified resolution.",
  },
];

const HOW_IT_WORKS: Step[] = [
  { icon: Eye,         step: "01", title: "Spot an issue",  desc: "See a pothole, broken light, or graffiti? Open the app." },
  { icon: Camera,      step: "02", title: "Snap & submit",  desc: "Take a photo, add a location, and file the report in seconds." },
  { icon: RefreshCw,   step: "03", title: "We track it",    desc: "Your report is assigned to the relevant department automatically." },
  { icon: CheckCircle, step: "04", title: "City fixes it",  desc: "The issue is resolved and you earn points for your contribution." },
];

// ---------------------------------------------------------------------------
// Section label helper
// ---------------------------------------------------------------------------
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      marginBottom: 16,
      padding: "5px 16px",
      borderRadius: 99,
      background: T.accentTint,
      fontSize: 10.5,
      fontWeight: 800,
      color: T.accentOnTint,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      boxShadow: SH.raisedSm,
    }}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------
function Navbar({ user }: { user: unknown }) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <>
      <nav style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 100,
        height: "calc(60px + env(safe-area-inset-top, 0px))",
        paddingTop: "env(safe-area-inset-top, 0px)",
        background: T.raised,
        boxShadow: scrolled || menuOpen
          ? `0 4px 16px ${T.shD}, 0 1px 0 ${T.border}`
          : `0 2px 6px ${T.shD}`,
        transition: "box-shadow 0.3s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: 20,
        paddingRight: 20,
        boxSizing: "border-box",
      }}>
        {/* Brand */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => router.push("/")}
          onKeyDown={e => e.key === "Enter" && router.push("/")}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
        >
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: SH.raisedSm,
            flexShrink: 0,
          }}>
            <MapPin size={17} color="#fff" strokeWidth={2.2} />
          </div>
          <span style={{
            fontSize: 16, fontWeight: 800,
            letterSpacing: "-0.03em",
            color: T.text1,
          }}>
            CivicTracker
          </span>
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user ? (
            <button
              onClick={() => router.push("/dashboard")}
              className="neo-btn-primary"
              style={{
                padding: "8px 20px",
                borderRadius: 12,
                fontSize: 13.5, fontWeight: 700, fontFamily: "inherit",
                background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
                border: "none", color: "#fff", cursor: "pointer",
                boxShadow: SH.raisedSm,
              }}
            >
              Dashboard
            </button>
          ) : (
            <>
              {/* Desktop only — sign in */}
              <button
                onClick={() => router.push("/login")}
                className="nav-desktop"
                style={{
                  padding: "8px 18px", borderRadius: 12,
                  fontSize: 13.5, fontWeight: 600, fontFamily: "inherit",
                  background: T.raised, border: "none",
                  color: T.text2, cursor: "pointer",
                  boxShadow: SH.raisedSm,
                }}
              >
                Sign in
              </button>
              {/* Desktop only — get started */}
              <button
                onClick={() => router.push("/login")}
                className="nav-desktop"
                style={{
                  padding: "8px 20px", borderRadius: 12,
                  fontSize: 13.5, fontWeight: 700, fontFamily: "inherit",
                  background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
                  border: "none", color: "#fff", cursor: "pointer",
                  boxShadow: SH.raisedSm,
                }}
              >
                Get Started
              </button>
            </>
          )}

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            style={{
              width: 38, height: 38, borderRadius: 11,
              background: T.raised, border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              boxShadow: menuOpen ? SH.insetSoft : SH.raisedSm,
              color: T.text2,
              transition: "box-shadow 0.18s ease",
            }}
          >
            {menuOpen
              ? <X size={18} strokeWidth={2} />
              : <Menu size={18} strokeWidth={2} />
            }
          </button>
        </div>
      </nav>

      {/* Mobile / dropdown menu */}
      {menuOpen && (
        <div style={{
          position: "fixed",
          top: "calc(60px + env(safe-area-inset-top, 0px))",
          left: 0, right: 0,
          zIndex: 99,
          background: T.raised,
          borderBottom: `1px solid ${T.border}`,
          boxShadow: `0 8px 24px ${T.shD}`,
          padding: "16px 20px 24px",
        }}>
          {["Features", "How it works", "Rewards"].map(l => (
            <div
              key={l}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: "14px 0",
                fontSize: 16, fontWeight: 600,
                color: T.text2,
                borderBottom: `1px solid ${T.border}`,
                cursor: "pointer",
              }}
            >
              {l}
            </div>
          ))}
          {!user && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
              <button
                onClick={() => { setMenuOpen(false); router.push("/login"); }}
                style={{
                  width: "100%", padding: "14px",
                  borderRadius: 16, border: "none",
                  background: T.base,
                  color: T.text2, fontSize: 15, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                  boxShadow: SH.raisedSm,
                }}
              >
                Sign in
              </button>
              <button
                onClick={() => { setMenuOpen(false); router.push("/login"); }}
                style={{
                  width: "100%", padding: "14px",
                  borderRadius: 16, border: "none",
                  background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
                  color: "#fff", fontSize: 15, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                  boxShadow: SH.raisedSm,
                }}
              >
                Get Started — it&apos;s free →
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface LandingUIProps {
  user: unknown;
  stats: {
    resolved: number;
    citizens: number;
    successRate: number;
  };
}

export default function LandingUI({ user, stats }: LandingUIProps) {
  const router = useRouter();

  return (
    <div style={{
      minHeight: "100dvh",
      background: T.base,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: T.text1,
      overflowX: "hidden",
    }}>
      <Navbar user={user} />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HERO                                                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "calc(60px + env(safe-area-inset-top, 0px) + 40px) 20px 72px",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 480, width: "100%" }}>

          {/* Logo chip */}
          <div style={{
            width: 70, height: 70, borderRadius: 20,
            background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 26px",
            boxShadow: `10px 10px 20px ${T.shD}, -8px -8px 16px ${T.shL}`,
          }}>
            <MapPin size={30} color="#fff" strokeWidth={2.2} />
          </div>

          {/* Live badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            marginBottom: 24,
            padding: "6px 16px", borderRadius: 99,
            background: T.accentTint,
            boxShadow: SH.raisedSm,
            fontSize: 12, fontWeight: 700,
            color: T.accentOnTint, letterSpacing: "0.04em",
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: T.accent,
              display: "inline-block",
              flexShrink: 0,
              animation: "pulseGreen 2s ease-in-out infinite",
            }} />
            Now live in your city
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: "clamp(36px, 10vw, 58px)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1.07,
            margin: "0 0 18px",
            color: T.text1,
          }}>
            Take care of{" "}
            <span style={{
              background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              your city
            </span>
          </h1>

          {/* Subtext */}
          <p style={{
            fontSize: 16, color: T.text2, lineHeight: 1.75,
            margin: "0 0 36px", fontWeight: 400,
            maxWidth: 360,
            marginLeft: "auto", marginRight: "auto",
          }}>
            Report civic issues, track repairs in real time, and earn rewards for
            making your neighborhood better.
          </p>

          {/* CTA buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 48 }}>
            <button
              onClick={() => router.push("/login")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "16px 24px", borderRadius: 16,
                fontSize: 15.5, fontWeight: 700, fontFamily: "inherit",
                background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
                border: "none", color: "#fff", cursor: "pointer", width: "100%",
                boxShadow: `6px 6px 14px ${T.shD}, -5px -5px 12px ${T.shL}`,
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              Get Started — it&apos;s free
              <ArrowRight size={17} strokeWidth={2.2} />
            </button>
            <button
              onClick={() => router.push(user ? "/dashboard" : "/login")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "15px 24px", borderRadius: 16,
                fontSize: 15, fontWeight: 600, fontFamily: "inherit",
                background: T.raised,
                border: "none", color: T.text2, cursor: "pointer", width: "100%",
                boxShadow: SH.raisedSm,
              }}
            >
              {user ? "Go to Dashboard" : "Sign in"}
            </button>
          </div>

          {/* Stat counters — inset pill bar */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            background: T.raised,
            borderRadius: 20,
            boxShadow: SH.inset,
            overflow: "hidden",
          }}>
            {[
              { target: stats.resolved,    suffix: "",  label: "Resolved" },
              { target: stats.citizens,    suffix: "",  label: "Citizens" },
              { target: stats.successRate, suffix: "%", label: "Success rate" },
            ].map(({ target, suffix, label }, i) => (
              <div key={label} style={{
                textAlign: "center",
                padding: "18px 8px",
                borderLeft: i > 0 ? `1px solid ${T.border}` : "none",
              }}>
                <div style={{
                  fontSize: 24, fontWeight: 900,
                  letterSpacing: "-0.04em",
                  color: T.text1, lineHeight: 1,
                }}>
                  <StatCounter target={target} suffix={suffix} />
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: T.text3,
                  marginTop: 5, textTransform: "uppercase", letterSpacing: "0.08em",
                }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll nudge */}
        <div style={{
          marginTop: 52,
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: 6, opacity: 0.35,
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.text3 }}>
            Scroll
          </span>
          <svg width="14" height="20" viewBox="0 0 14 20" fill="none">
            <rect x="5" y="2" width="4" height="6" rx="2" fill={T.text3} />
            <rect x="0.5" y="0.5" width="13" height="19" rx="6.5" stroke={T.border} strokeWidth="1.2" />
          </svg>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FEATURES                                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: "72px 20px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <SectionLabel>Features</SectionLabel>
          <h2 style={{
            fontSize: "clamp(26px, 7vw, 40px)", fontWeight: 900,
            letterSpacing: "-0.03em", lineHeight: 1.12,
            margin: 0, color: T.text1,
          }}>
            Everything you need<br />
            <span style={{ color: T.text3 }}>to fix your city</span>
          </h2>
        </div>

        <div style={{
          display: "flex", flexDirection: "column",
          gap: 16, maxWidth: 520, margin: "0 auto",
        }}>
          {FEATURES.map(f => {
            const Icon = f.icon;
            const chip = T.dept[f.dept];
            return (
              <div key={f.title} style={{
                padding: "26px 24px",
                background: T.raised,
                borderRadius: 24,
                boxShadow: SH.raised,
              }}>
                {/* Icon chip + title row */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: 14,
                    background: chip.bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: chip.fg, flexShrink: 0,
                    boxShadow: SH.raisedSm,
                  }}>
                    <Icon size={22} strokeWidth={1.8} />
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: 17, fontWeight: 800,
                      color: T.text1, margin: "0 0 5px",
                      letterSpacing: "-0.02em",
                    }}>
                      {f.title}
                    </h3>
                    <span style={{
                      display: "inline-flex", alignItems: "center",
                      padding: "2px 10px", borderRadius: 99,
                      background: chip.bg,
                      fontSize: 10, fontWeight: 800,
                      color: chip.fg, letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}>
                      {f.badge}
                    </span>
                  </div>
                </div>
                <p style={{
                  fontSize: 14, color: T.text2,
                  lineHeight: 1.65, margin: 0,
                }}>
                  {f.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HOW IT WORKS                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: "0 20px 72px" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <SectionLabel>Process</SectionLabel>
          <h2 style={{
            fontSize: "clamp(26px, 7vw, 40px)", fontWeight: 900,
            letterSpacing: "-0.03em", lineHeight: 1.12,
            margin: 0, color: T.text1,
          }}>
            From spot to fixed<br />
            <span style={{ color: T.text3 }}>in four steps</span>
          </h2>
        </div>

        <div style={{
          display: "flex", flexDirection: "column",
          maxWidth: 420, margin: "0 auto",
        }}>
          {HOW_IT_WORKS.map((item, i) => {
            const Icon = item.icon;
            const isActive = i === 1; // "Snap & submit" highlighted

            return (
              <div key={item.step} style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                {/* Node + vertical connector */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: 15,
                    background: isActive
                      ? `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`
                      : T.raised,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: isActive ? "#fff" : T.text3,
                    boxShadow: isActive
                      ? `6px 6px 14px ${T.shD}, -5px -5px 12px ${T.shL}`
                      : SH.raisedSm,
                  }}>
                    <Icon size={21} strokeWidth={1.8} />
                  </div>
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div style={{
                      width: 1.5, height: 34,
                      background: T.border,
                      margin: "6px 0",
                    }} />
                  )}
                </div>

                {/* Text block */}
                <div style={{ paddingTop: 11, paddingBottom: i < HOW_IT_WORKS.length - 1 ? 0 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 800,
                      color: isActive ? T.accent : T.text3,
                      letterSpacing: "0.1em", textTransform: "uppercase",
                    }}>
                      {item.step}
                    </span>
                    <h4 style={{
                      fontSize: 15.5, fontWeight: 700,
                      color: isActive ? T.text1 : T.text2,
                      margin: 0, letterSpacing: "-0.01em",
                    }}>
                      {item.title}
                    </h4>
                  </div>
                  <p style={{
                    fontSize: 13.5, color: T.text3,
                    lineHeight: 1.6,
                    margin: "0 0 6px",
                  }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CTA BANNER                                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: "0 20px 80px" }}>
        <div style={{
          borderRadius: 28, padding: "52px 28px",
          textAlign: "center",
          background: T.accentTint,
          boxShadow: SH.raised,
          position: "relative",
          overflow: "hidden",
          maxWidth: 520,
          margin: "0 auto",
        }}>
          {/* Subtle inner radial */}
          <div style={{
            position: "absolute", top: -24, left: "50%",
            transform: "translateX(-50%)",
            width: 280, height: 200,
            background: `radial-gradient(ellipse, rgba(29,158,117,0.18) 0%, transparent 70%)`,
            pointerEvents: "none",
          }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Mini logo chip */}
            <div style={{
              width: 58, height: 58, borderRadius: 16,
              background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
              boxShadow: SH.raisedSm,
            }}>
              <MapPin size={24} color="#fff" strokeWidth={2.2} />
            </div>

            <h2 style={{
              fontSize: "clamp(22px, 6vw, 34px)", fontWeight: 900,
              letterSpacing: "-0.03em", margin: "0 0 12px",
              color: T.accentOnTint,
            }}>
              Your city needs you
            </h2>
            <p style={{
              fontSize: 15, lineHeight: 1.65,
              margin: "0 auto 32px", maxWidth: 300,
              color: T.accentOnTint, opacity: 0.72,
            }}>
              Join thousands of citizens making their neighborhoods better — one report at a time.
            </p>

            <button
              onClick={() => router.push("/login")}
              style={{
                display: "flex", alignItems: "center",
                justifyContent: "center", gap: 8,
                padding: "16px 0", borderRadius: 16,
                fontSize: 15, fontWeight: 700, fontFamily: "inherit",
                background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
                border: "none", color: "#fff", cursor: "pointer",
                width: "100%", maxWidth: 320, margin: "0 auto",
                boxShadow: `6px 6px 14px ${T.shD}, -5px -5px 12px ${T.shL}`,
              }}
            >
              Start reporting now
              <ArrowRight size={16} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FOOTER                                                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <footer style={{
        borderTop: `1px solid ${T.border}`,
        padding: "24px 20px",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 28px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 8,
            background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `3px 3px 6px ${T.shD}, -2px -2px 5px ${T.shL}`,
            flexShrink: 0,
          }}>
            <MapPin size={13} color="#fff" strokeWidth={2.2} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text3 }}>
            CivicTracker © 2026
          </span>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {["Privacy", "Terms", "Contact"].map(l => (
            <span key={l} style={{
              fontSize: 12, fontWeight: 600,
              color: T.text3, cursor: "pointer",
            }}>
              {l}
            </span>
          ))}
        </div>
      </footer>

      {/* ─── Inline styles ─────────────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulseGreen {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.55; transform: scale(0.82); }
        }

        /* Desktop nav buttons — hidden on mobile, shown at 640px+ */
        .nav-desktop {
          display: none !important;
        }
        @media (min-width: 640px) {
          .nav-desktop {
            display: flex !important;
          }
        }

        /* Hover lift on primary CTA */
        button:active {
          transform: scale(0.98);
        }
      ` }} />
    </div>
  );
}
