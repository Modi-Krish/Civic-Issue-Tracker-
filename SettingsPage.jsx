import React, { useState } from "react";
import {
  Home,
  FileText,
  Map,
  Settings as SettingsIcon,
  Plus,
  Mail,
  Shield,
  CalendarDays,
  Palette,
  Bell,
  Star,
  HelpCircle,
  LogOut,
  Pencil,
  Check,
  ChevronRight,
  Building2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens — neomorphism-lite (light) + a real high-contrast alternative
// ---------------------------------------------------------------------------
const LIGHT = {
  base: "#EDEBE4",
  raised: "#F5F3EC",
  border: "#DDD9CE",
  text1: "#2C2C2A",
  text2: "#5F5E5A",
  text3: "#888780",
  accent: "#1D9E75",
  accentDark: "#167A5B",
  accentTint: "#E1F5EE",
  accentOnTint: "#085041",
  shL: "rgba(255,255,255,0.75)",
  shD: "rgba(0,0,0,0.09)",
  dept: {
    roads: { bg: "#E6F1FB", fg: "#0C447C" },
    elec: { bg: "#FAEEDA", fg: "#854F0B" },
    fire: { bg: "#FCEBEB", fg: "#791F1F" },
    water: { bg: "#EAF3DE", fg: "#27500A" },
    san: { bg: "#FAECE7", fg: "#712B13" },
    parks: { bg: "#EEEDFE", fg: "#3C3489" },
  },
};

const HC = {
  base: "#FFFFFF",
  raised: "#FFFFFF",
  border: "#1A1A18",
  text1: "#000000",
  text2: "#202020",
  text3: "#3A3A3A",
  accent: "#0B6B4C",
  accentDark: "#084F38",
  accentTint: "#FFFFFF",
  accentOnTint: "#0B6B4C",
  shL: "rgba(0,0,0,0)",
  shD: "rgba(0,0,0,0)",
  dept: {
    roads: { bg: "#FFFFFF", fg: "#0C447C" },
    elec: { bg: "#FFFFFF", fg: "#854F0B" },
    fire: { bg: "#FFFFFF", fg: "#791F1F" },
    water: { bg: "#FFFFFF", fg: "#27500A" },
    san: { bg: "#FFFFFF", fg: "#712B13" },
    parks: { bg: "#FFFFFF", fg: "#3C3489" },
  },
};

// ---------------------------------------------------------------------------
// Small style helpers — build box-shadow strings from the active token set
// ---------------------------------------------------------------------------
function useShadows(t, hc) {
  return {
    raised: hc
      ? { boxShadow: "none", border: `1.5px solid ${t.border}` }
      : { boxShadow: `8px 8px 16px ${t.shD}, -8px -8px 16px ${t.shL}` },
    raisedSm: hc
      ? { boxShadow: "none", border: `1.5px solid ${t.border}` }
      : { boxShadow: `4px 4px 8px ${t.shD}, -4px -4px 8px ${t.shL}` },
    inset: hc
      ? { boxShadow: "none", border: `1.5px solid ${t.border}` }
      : { boxShadow: `inset 5px 5px 10px ${t.shD}, inset -5px -5px 10px ${t.shL}` },
    insetSoft: hc
      ? { boxShadow: "none", border: `1.5px solid ${t.border}` }
      : { boxShadow: `inset 3px 3px 7px ${t.shD}, inset -3px -3px 7px ${t.shL}` },
  };
}

function IconChip({ icon: Icon, bg, fg, size = 44, style = {} }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        background: bg,
        color: fg,
        ...style,
      }}
    >
      <Icon size={20} strokeWidth={1.8} />
    </div>
  );
}

function Row({ icon, iconBg, iconFg, label, value, linkable, hc, accentTint, textColors }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => linkable && setHover(true)}
      onMouseLeave={() => linkable && setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 6px",
        borderRadius: 12,
        cursor: linkable ? "pointer" : "default",
        background: linkable && hover ? accentTint : "transparent",
        outline: linkable && hover && hc ? `1.5px solid ${textColors.accent}` : "none",
        transition: "background .15s ease",
      }}
    >
      <IconChip icon={icon} bg={iconBg} fg={iconFg} style={hc ? { border: `1.5px solid ${iconFg}` } : {}} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: textColors.text3 }}>{label}</div>
        <div style={{ fontSize: 14.5, fontWeight: linkable ? 500 : 600, color: textColors.text1, marginTop: 2 }}>
          {value}
        </div>
      </div>
      {linkable && (
        <div style={{ color: textColors.text3, flexShrink: 0, display: "flex" }}>
          <ChevronRight size={16} strokeWidth={2} />
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [hc, setHc] = useState(false);
  const t = hc ? HC : LIGHT;
  const sh = useShadows(t, hc);

  const navItem = (Icon, label, active) => (
    <a
      href="#"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 16,
        textDecoration: "none",
        fontSize: 14,
        fontWeight: 600,
        color: active ? t.accentOnTint : t.text2,
        background: active ? t.accentTint : "transparent",
        ...(active ? sh.insetSoft : {}),
      }}
    >
      <Icon size={19} strokeWidth={1.8} />
      {label}
    </a>
  );

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        background: t.base,
        color: t.text1,
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        transition: "background .25s ease, color .25s ease",
      }}
    >
      {/* ============ Sidebar ============ */}
      <aside
        className="hidden md:flex"
        style={{
          width: 248,
          flexShrink: 0,
          background: t.raised,
          padding: "28px 18px",
          flexDirection: "column",
          gap: 6,
          position: "sticky",
          top: 0,
          height: "100vh",
          boxShadow: hc ? "none" : `6px 0 20px ${t.shD}`,
          borderRight: hc ? `1.5px solid ${t.border}` : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px 26px 10px" }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: `linear-gradient(145deg, ${t.accent}, ${t.accentDark})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: hc ? "none" : `4px 4px 8px ${t.shD}, -3px -3px 7px ${t.shL}`,
              border: hc ? `1.5px solid ${t.accentDark}` : "none",
            }}
          >
            <Building2 size={20} color="#fff" strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.2 }}>Civic Tracker</div>
            <div style={{ fontSize: 11, color: t.text3 }}>Pro · Gov Portal</div>
          </div>
        </div>

        {navItem(Home, "Home", false)}
        {navItem(FileText, "My Reports", false)}
        {navItem(Map, "Map", false)}
        {navItem(SettingsIcon, "Settings", true)}

        <button
          style={{
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "13px 14px",
            borderRadius: 16,
            background: `linear-gradient(145deg, ${t.accent}, ${t.accentDark})`,
            color: "#fff",
            fontWeight: 700,
            fontSize: 13.5,
            border: hc ? `2px solid ${t.accentDark}` : "none",
            boxShadow: hc ? "none" : `5px 5px 12px ${t.shD}, -4px -4px 10px ${t.shL}`,
            cursor: "pointer",
          }}
        >
          <Plus size={16} strokeWidth={2.4} />
          Report an Issue
        </button>

        <div style={{ marginTop: "auto", padding: "14px 10px 4px", fontSize: 10.5, color: t.text3, lineHeight: 1.6 }}>
          CIVIC TRACKER PRO
          <br />
          Stable Build v1.4.2
        </div>
      </aside>

      {/* ============ Main ============ */}
      <main style={{ flex: 1, padding: "44px 24px 70px", maxWidth: 1180 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 32, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 29, fontWeight: 700, letterSpacing: "-0.01em", margin: 0 }}>Settings</h1>
            <p style={{ marginTop: 4, fontSize: 13.5, color: t.text3 }}>Global preferences &amp; account</p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 16px",
              borderRadius: 100,
              background: t.raised,
              ...sh.inset,
            }}
          >
            <span style={{ fontSize: 12.5, fontWeight: 600, color: t.text2, whiteSpace: "nowrap" }}>
              Accessible mode
            </span>
            <button
              onClick={() => setHc((v) => !v)}
              aria-pressed={hc}
              aria-label="Toggle high-contrast accessible mode"
              style={{
                width: 44,
                height: 24,
                borderRadius: 100,
                position: "relative",
                cursor: "pointer",
                border: hc ? `1.5px solid ${t.border}` : "none",
                background: hc ? t.raised : t.accentTint,
                flexShrink: 0,
                padding: 0,
                boxShadow: hc ? "none" : `inset 4px 4px 8px ${t.shD}, inset -4px -4px 8px ${t.shL}`,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: hc ? 3 : 23,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: hc ? t.raised : t.accent,
                  border: hc ? `1.5px solid ${t.border}` : "none",
                  boxShadow: hc ? "none" : `2px 2px 5px ${t.shD}, -2px -2px 5px ${t.shL}`,
                  transition: "left .18s ease, background .18s ease",
                }}
              />
            </button>
          </div>
        </div>

        {/* Profile card */}
        <div
          style={{
            padding: "30px 34px",
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 28,
            background: t.raised,
            borderRadius: 20,
            flexWrap: "wrap",
            ...sh.raised,
          }}
        >
          <div
            style={{
              width: 66,
              height: 66,
              borderRadius: 18,
              background: `linear-gradient(150deg, ${t.accent}, ${t.accentDark})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: 22,
              flexShrink: 0,
              border: hc ? `2px solid ${t.accentDark}` : "none",
              boxShadow: hc ? "none" : `5px 5px 12px ${t.shD}, -4px -4px 10px ${t.shL}`,
            }}
          >
            GO
          </div>

          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Gov Officer</h2>
              <button
                aria-label="Edit name"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  border: hc ? `1.5px solid ${t.border}` : "none",
                  background: t.raised,
                  color: t.text3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: hc ? "none" : `3px 3px 7px ${t.shD}, -3px -3px 7px ${t.shL}`,
                }}
              >
                <Pencil size={13} strokeWidth={2} />
              </button>
            </div>
            <div style={{ fontSize: 13.5, color: t.text2, marginTop: 4 }}>
              govofficercivictracker@gmail.com
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 12,
                padding: "6px 13px 6px 10px",
                borderRadius: 100,
                background: t.accentTint,
                color: t.accentOnTint,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.04em",
                border: hc ? `1.5px solid ${t.accent}` : "none",
                boxShadow: hc ? "none" : `2px 2px 6px ${t.shD}, -2px -2px 6px ${t.shL}`,
              }}
            >
              <Check size={13} strokeWidth={2} />
              CITIZEN
            </span>
          </div>
        </div>

        {/* Two-column info */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 28,
            alignItems: "start",
            marginBottom: 28,
          }}
        >
          <section style={{ padding: "26px 26px 12px", background: t.raised, borderRadius: 20, ...sh.raised }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: t.text3, textTransform: "uppercase", padding: "0 6px 16px" }}>
              Account Identification
            </div>
            <Row icon={Mail} iconBg={t.dept.roads.bg} iconFg={t.dept.roads.fg} label="Email Address" value="govofficercivictracker@gmail.com" hc={hc} accentTint={t.accentTint} textColors={t} />
            <Row icon={Shield} iconBg={t.dept.fire.bg} iconFg={t.dept.fire.fg} label="Access Level" value="Citizen" hc={hc} accentTint={t.accentTint} textColors={t} />
            <Row icon={CalendarDays} iconBg={t.dept.elec.bg} iconFg={t.dept.elec.fg} label="Citizen Join Date" value="July 2026" hc={hc} accentTint={t.accentTint} textColors={t} />
          </section>

          <section style={{ padding: "26px 26px 12px", background: t.raised, borderRadius: 20, ...sh.raised }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: t.text3, textTransform: "uppercase", padding: "0 6px 16px" }}>
              Experience Settings
            </div>
            <Row icon={Palette} iconBg={t.dept.parks.bg} iconFg={t.dept.parks.fg} label="Visual Theme" value="Lavender Energy" linkable hc={hc} accentTint={t.accentTint} textColors={t} />
            <Row icon={Bell} iconBg={t.dept.elec.bg} iconFg={t.dept.elec.fg} label="Push Alerts" value="All Enabled" linkable hc={hc} accentTint={t.accentTint} textColors={t} />
            <Row icon={Star} iconBg={t.accentTint} iconFg={t.accentOnTint} label="Achievement" value="1,240 XP" linkable hc={hc} accentTint={t.accentTint} textColors={t} />
            <Row icon={HelpCircle} iconBg={t.dept.san.bg} iconFg={t.dept.san.fg} label="Citizen Help" value="Support Hub" linkable hc={hc} accentTint={t.accentTint} textColors={t} />
          </section>
        </div>

        {/* Sign out */}
        <button
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: 17,
            borderRadius: 20,
            background: t.raised,
            border: `${hc ? 2 : 1.5}px solid ${t.dept.fire.fg}`,
            color: t.dept.fire.fg,
            fontWeight: 700,
            fontSize: 14.5,
            cursor: "pointer",
            marginBottom: 30,
            boxShadow: hc ? "none" : `6px 6px 14px ${t.shD}, -5px -5px 12px ${t.shL}`,
          }}
        >
          <LogOut size={17} strokeWidth={2} />
          Sign Out Securely
        </button>

        <p style={{ textAlign: "center", fontSize: 11, color: t.text3, letterSpacing: "0.03em", lineHeight: 1.7 }}>
          CIVIC TRACKER PRO — STABLE BUILD v1.4.2
        </p>
      </main>
    </div>
  );
}
