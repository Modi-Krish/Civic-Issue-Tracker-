'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginWithEmail, signIn, signUp } from '@/lib/client-actions/auth';
import {
  MapPin,
  Shield,
  Award,
  Wrench,
  Zap,
  Building2,
  Briefcase,
  User,
  ChevronRight,
  Loader2,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  AlertTriangle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Design tokens — neomorphism-lite (identical pattern to SettingsPage.jsx)
// ---------------------------------------------------------------------------
const LIGHT = {
  base: '#EDEBE4',
  raised: '#F5F3EC',
  border: '#DDD9CE',
  text1: '#2C2C2A',
  text2: '#5F5E5A',
  text3: '#888780',
  accent: '#1D9E75',
  accentDark: '#167A5B',
  accentTint: '#E1F5EE',
  accentOnTint: '#085041',
  shL: 'rgba(255,255,255,0.75)',
  shD: 'rgba(0,0,0,0.09)',
  dept: {
    roads: { bg: '#E6F1FB', fg: '#0C447C' },
    elec:  { bg: '#FAEEDA', fg: '#854F0B' },
    fire:  { bg: '#FCEBEB', fg: '#791F1F' },
    water: { bg: '#EAF3DE', fg: '#27500A' },
    san:   { bg: '#FAECE7', fg: '#712B13' },
    parks: { bg: '#EEEDFE', fg: '#3C3489' },
  },
};

const HC = {
  base: '#FFFFFF',
  raised: '#FFFFFF',
  border: '#1A1A18',
  text1: '#000000',
  text2: '#202020',
  text3: '#3A3A3A',
  accent: '#0B6B4C',
  accentDark: '#084F38',
  accentTint: '#FFFFFF',
  accentOnTint: '#0B6B4C',
  shL: 'rgba(0,0,0,0)',
  shD: 'rgba(0,0,0,0)',
  dept: {
    roads: { bg: '#FFFFFF', fg: '#0C447C' },
    elec:  { bg: '#FFFFFF', fg: '#854F0B' },
    fire:  { bg: '#FFFFFF', fg: '#791F1F' },
    water: { bg: '#FFFFFF', fg: '#27500A' },
    san:   { bg: '#FFFFFF', fg: '#712B13' },
    parks: { bg: '#FFFFFF', fg: '#3C3489' },
  },
};

type Tokens = typeof LIGHT;

function useShadows(t: Tokens, hc: boolean) {
  return {
    raised: hc
      ? { boxShadow: 'none', border: `1.5px solid ${t.border}` }
      : { boxShadow: `8px 8px 16px ${t.shD}, -8px -8px 16px ${t.shL}` },
    raisedSm: hc
      ? { boxShadow: 'none', border: `1.5px solid ${t.border}` }
      : { boxShadow: `4px 4px 8px ${t.shD}, -4px -4px 8px ${t.shL}` },
    inset: hc
      ? { boxShadow: 'none', border: `1.5px solid ${t.border}` }
      : { boxShadow: `inset 5px 5px 10px ${t.shD}, inset -5px -5px 10px ${t.shL}` },
    insetSoft: hc
      ? { boxShadow: 'none', border: `1.5px solid ${t.border}` }
      : { boxShadow: `inset 3px 3px 7px ${t.shD}, inset -3px -3px 7px ${t.shL}` },
    insetFocus: hc
      ? { boxShadow: 'none', border: `2px solid ${t.accent}` }
      : { boxShadow: `inset 5px 5px 10px ${t.shD}, inset -5px -5px 10px ${t.shL}` },
  };
}

// ---------------------------------------------------------------------------
// Seed users with department color mapping
// ---------------------------------------------------------------------------
interface SeededUser {
  email: string;
  roleName: string;
  description: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  deptKey: keyof typeof LIGHT.dept;
}

const SEED_USERS: SeededUser[] = [
  {
    email: 'superadmincivictracker@gmail.com',
    roleName: 'Super Admin',
    description: 'System dashboard, user approvals, master platform logs.',
    icon: Shield,
    deptKey: 'fire',
  },
  {
    email: 'govofficercivictracker@gmail.com',
    roleName: 'Gov. Officer',
    description: 'Oversees city issues, issues tenders, approves final contractor works.',
    icon: Award,
    deptKey: 'roads',
  },
  {
    email: 'roadcivictracker@gmail.com',
    roleName: 'Roads Admin',
    description: 'Monitors road damage, creates tenders, manages road department budget.',
    icon: Wrench,
    deptKey: 'san',
  },
  {
    email: 'electricitycivictracker@gmail.com',
    roleName: 'Electricity Admin',
    description: 'Monitors power-line issues, manages local power grid and tenders.',
    icon: Zap,
    deptKey: 'elec',
  },
  {
    email: 'companyadmincivictracker@gmail.com',
    roleName: 'Company Admin',
    description: 'Submits bids for open tenders, assigns employees to active repair projects.',
    icon: Building2,
    deptKey: 'parks',
  },
  {
    email: 'companyemployeecivictracker@gmail.com',
    roleName: 'Field Employee',
    description: 'Completes physical repairs, uploads before/after proofs, updates statuses.',
    icon: Briefcase,
    deptKey: 'water',
  },
  {
    email: 'citizencivictracker@gmail.com',
    roleName: 'Citizen',
    description: 'Reports civic issues, tracks real-time progress, rates repair quality.',
    icon: User,
    deptKey: 'water',
  },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function LoginPage() {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [hc, setHc] = useState(false);
  const t = hc ? HC : LIGHT;
  const sh = useShadows(t, hc);

  // Login states
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [manualEmail, setManualEmail] = useState('');
  const [manualPassword, setManualPassword] = useState('');
  const [loadingManual, setLoadingManual] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signup states
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [showSignupPw, setShowSignupPw] = useState(false);

  // Focus tracking for inset input states
  const [focused, setFocused] = useState<string | null>(null);

  const router = useRouter();

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  async function handleQuickLogin(email: string) {
    if (loadingEmail) return;
    setLoadingEmail(email);
    setError(null);
    try {
      const result = await loginWithEmail(email);
      if (result?.error) { setError(result.error); setLoadingEmail(null); }
      else if (result?.redirectTo) { router.push(result.redirectTo); }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
      setLoadingEmail(null);
    }
  }

  async function handleManualLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!manualEmail || !manualPassword) { setError('Please enter both email and password.'); return; }
    setLoadingManual(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('email', manualEmail.trim());
      fd.append('password', manualPassword);
      const result = await signIn(fd);
      if (result?.error) { setError(result.error); setLoadingManual(false); }
      else if (result?.redirectTo) { router.push(result.redirectTo); }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
      setLoadingManual(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setSignupLoading(true);
    setSignupError(null);
    const result = await signUp(new FormData(e.currentTarget as HTMLFormElement));
    if (result?.error) { setSignupError(result.error); setSignupLoading(false); }
    else if (result?.redirectTo) { router.push(result.redirectTo); }
  }

  // ---------------------------------------------------------------------------
  // Style helpers
  // ---------------------------------------------------------------------------
  function inputShadow(name: string) {
    if (hc) return { boxShadow: 'none', border: focused === name ? `2px solid ${t.accent}` : `1.5px solid ${t.border}` };
    return focused === name ? sh.insetFocus : sh.insetSoft;
  }

  function inputStyle(name: string): React.CSSProperties {
    return {
      width: '100%',
      padding: '14px 16px',
      borderRadius: 14,
      background: t.raised,
      color: t.text1,
      fontSize: 15,
      outline: 'none',
      fontFamily: 'inherit',
      boxSizing: 'border-box',
      transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
      ...inputShadow(name),
    };
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: t.text3,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 10,
  };

  const currentError = tab === 'login' ? error : signupError;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: t.base,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: t.text1,
        boxSizing: 'border-box',
        padding: '32px 16px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 40px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transition: 'background 0.25s ease, color 0.25s ease',
      }}
    >
      {/* ─── Accessible mode toggle — top-right ─────────────────────────── */}
      <div
        style={{
          width: '100%',
          maxWidth: 1100,
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 28,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 14px',
            borderRadius: 100,
            background: t.raised,
            ...sh.inset,
          }}
        >
          <span
            style={{ fontSize: 12, fontWeight: 600, color: t.text2, whiteSpace: 'nowrap' }}
          >
            Accessible mode
          </span>
          <button
            onClick={() => setHc(v => !v)}
            aria-pressed={hc}
            aria-label="Toggle high-contrast accessible mode"
            style={{
              width: 44,
              height: 24,
              borderRadius: 100,
              position: 'relative',
              cursor: 'pointer',
              border: hc ? `1.5px solid ${t.border}` : 'none',
              background: hc ? t.raised : t.accentTint,
              flexShrink: 0,
              padding: 0,
              boxShadow: hc
                ? 'none'
                : `inset 4px 4px 8px ${t.shD}, inset -4px -4px 8px ${t.shL}`,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 3,
                left: hc ? 3 : 23,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: hc ? t.border : t.accent,
                border: hc ? `1.5px solid ${t.border}` : 'none',
                boxShadow: hc
                  ? 'none'
                  : `2px 2px 5px ${t.shD}, -2px -2px 5px ${t.shL}`,
                transition: 'left 0.18s ease, background 0.18s ease',
              }}
            />
          </button>
        </div>
      </div>

      {/* ─── Content wrapper ─────────────────────────────────────────────── */}
      <div
        style={{
          width: '100%',
          maxWidth: 1100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 28,
        }}
      >
        {/* ─── Brand header ──────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: `linear-gradient(145deg, ${t.accent}, ${t.accentDark})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              border: hc ? `2px solid ${t.accentDark}` : 'none',
              boxShadow: hc
                ? 'none'
                : `8px 8px 18px ${t.shD}, -6px -6px 14px ${t.shL}`,
            }}
          >
            <MapPin size={28} color="#fff" strokeWidth={2.2} />
          </div>
          <h1
            style={{
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              margin: '0 0 8px',
              color: t.text1,
            }}
          >
            Civic Issue Tracker
          </h1>
          <p style={{ fontSize: 14, color: t.text3, margin: 0, fontWeight: 500 }}>
            A soft, tactile civic platform — calm, modern, accessible.
          </p>
        </div>

        {/* ─── Tab bar ───────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'inline-flex',
            background: t.raised,
            borderRadius: 100,
            padding: 5,
            gap: 4,
            ...sh.inset,
          }}
        >
          {(['login', 'signup'] as const).map(key => (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                setError(null);
                setSignupError(null);
              }}
              style={{
                padding: '10px 32px',
                borderRadius: 100,
                fontWeight: 700,
                fontSize: 14,
                fontFamily: 'inherit',
                border: hc ? (tab === key ? `1.5px solid ${t.accentDark}` : `1.5px solid transparent`) : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background:
                  tab === key
                    ? `linear-gradient(145deg, ${t.accent}, ${t.accentDark})`
                    : 'transparent',
                color: tab === key ? '#fff' : t.text3,
                boxShadow:
                  tab === key && !hc
                    ? `4px 4px 10px ${t.shD}, -3px -3px 8px ${t.shL}`
                    : 'none',
              }}
            >
              {key === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* ─── Error alert ───────────────────────────────────────────────── */}
        {currentError && (
          <div
            role="alert"
            style={{
              width: '100%',
              maxWidth: 600,
              padding: '14px 18px',
              borderRadius: 16,
              background: t.dept.fire.bg,
              border: hc ? `1.5px solid ${t.dept.fire.fg}` : 'none',
              boxShadow: hc ? 'none' : `4px 4px 8px ${t.shD}, -3px -3px 7px ${t.shL}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: t.dept.fire.fg,
            }}
          >
            <AlertTriangle size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{currentError}</span>
          </div>
        )}

        {/* ================================================================ */}
        {/*  SIGN IN TAB                                                     */}
        {/* ================================================================ */}
        {tab === 'login' && (
          <>
            {/* ─── Quick-access role cards ───────────────────────────── */}
            <div style={{ width: '100%' }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: t.text3,
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  marginBottom: 20,
                }}
              >
                Quick Access — Select a Role
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                  gap: 16,
                }}
              >
                {SEED_USERS.map(user => {
                  const Icon = user.icon;
                  const isLoading = loadingEmail === user.email;
                  const isAnyLoading = loadingEmail !== null;
                  const chip = t.dept[user.deptKey];

                  return (
                    <div
                      key={user.email}
                      role="button"
                      tabIndex={isAnyLoading ? -1 : 0}
                      aria-disabled={isAnyLoading && !isLoading}
                      aria-label={`Quick login as ${user.roleName}`}
                      onClick={() => handleQuickLogin(user.email)}
                      onKeyDown={e =>
                        e.key === 'Enter' && !isAnyLoading && handleQuickLogin(user.email)
                      }
                      style={{
                        padding: '20px 22px',
                        background: t.raised,
                        borderRadius: 20,
                        cursor: isAnyLoading ? 'not-allowed' : 'pointer',
                        opacity: isAnyLoading && !isLoading ? 0.45 : 1,
                        border: hc ? `1.5px solid ${t.border}` : 'none',
                        boxShadow: hc
                          ? 'none'
                          : isLoading
                          ? `inset 4px 4px 8px ${t.shD}, inset -4px -4px 8px ${t.shL}`
                          : `6px 6px 14px ${t.shD}, -5px -5px 12px ${t.shL}`,
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                      }}
                    >
                      {/* Icon + role name */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: chip.bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: chip.fg,
                            flexShrink: 0,
                            border: hc ? `1.5px solid ${chip.fg}` : 'none',
                            boxShadow: hc
                              ? 'none'
                              : `3px 3px 7px ${t.shD}, -3px -3px 7px ${t.shL}`,
                          }}
                        >
                          <Icon size={20} strokeWidth={1.8} />
                        </div>
                        <div>
                          <div
                            style={{ fontWeight: 700, fontSize: 15, color: t.text1, lineHeight: 1.2 }}
                          >
                            {user.roleName}
                          </div>
                          <div style={{ fontSize: 11, color: t.text3, marginTop: 3 }}>
                            {user.email}
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p
                        style={{
                          fontSize: 13,
                          color: t.text2,
                          lineHeight: 1.55,
                          margin: 0,
                          flexGrow: 1,
                        }}
                      >
                        {user.description}
                      </p>

                      {/* Action row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: 12,
                          borderTop: `1px solid ${hc ? t.border : 'rgba(0,0,0,0.06)'}`,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: chip.fg,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {isLoading ? 'Logging in…' : 'Launch Dashboard'}
                        </span>
                        {isLoading ? (
                          <Loader2
                            size={15}
                            color={chip.fg}
                            style={{ animation: 'spin 1s linear infinite' }}
                          />
                        ) : (
                          <ChevronRight size={15} color={t.text3} strokeWidth={2} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── Divider ───────────────────────────────────────────── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                width: '100%',
                maxWidth: 520,
              }}
            >
              <div style={{ flex: 1, height: 1, background: t.border }} />
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: t.text3,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                or sign in manually
              </span>
              <div style={{ flex: 1, height: 1, background: t.border }} />
            </div>

            {/* ─── Manual login form ─────────────────────────────────── */}
            <div
              style={{
                width: '100%',
                maxWidth: 480,
                padding: '32px 28px',
                background: t.raised,
                borderRadius: 24,
                ...sh.raised,
              }}
            >
              <form
                onSubmit={handleManualLogin}
                style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
              >
                {/* Email */}
                <div>
                  <label htmlFor="login-email" style={labelStyle}>
                    Email Address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={manualEmail}
                    onChange={e => setManualEmail(e.target.value)}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    placeholder="you@example.com"
                    style={inputStyle('email')}
                  />
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="login-password" style={labelStyle}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={manualPassword}
                      onChange={e => setManualPassword(e.target.value)}
                      onFocus={() => setFocused('password')}
                      onBlur={() => setFocused(null)}
                      placeholder="••••••••"
                      style={{ ...inputStyle('password'), paddingRight: 52 }}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(v => !v)}
                      style={{
                        position: 'absolute',
                        right: 14,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: t.text3,
                        display: 'flex',
                        padding: 4,
                      }}
                    >
                      {showPassword ? (
                        <EyeOff size={18} strokeWidth={1.8} />
                      ) : (
                        <Eye size={18} strokeWidth={1.8} />
                      )}
                    </button>
                  </div>
                </div>

                {/* CTA */}
                <button
                  type="submit"
                  disabled={loadingManual}
                  style={{
                    width: '100%',
                    padding: '15px',
                    borderRadius: 16,
                    background: loadingManual
                      ? t.base
                      : `linear-gradient(145deg, ${t.accent}, ${t.accentDark})`,
                    color: loadingManual ? t.text3 : '#fff',
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    border: hc ? `2px solid ${t.accentDark}` : 'none',
                    boxShadow:
                      hc || loadingManual
                        ? 'none'
                        : `5px 5px 12px ${t.shD}, -4px -4px 10px ${t.shL}`,
                    cursor: loadingManual ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all 0.2s ease',
                    marginTop: 4,
                  }}
                >
                  {loadingManual ? (
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <>
                      <LogIn size={17} strokeWidth={2} />
                      Sign In
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* ─── Switch to signup ──────────────────────────────────── */}
            <p style={{ fontSize: 14, color: t.text3, textAlign: 'center', margin: 0 }}>
              New to CivicTracker?{' '}
              <button
                onClick={() => { setTab('signup'); setError(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: t.accent,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  textDecoration: hc ? 'underline' : 'none',
                }}
              >
                Create an account
              </button>
            </p>
          </>
        )}

        {/* ================================================================ */}
        {/*  SIGN UP TAB                                                     */}
        {/* ================================================================ */}
        {tab === 'signup' && (
          <>
            <div
              style={{
                width: '100%',
                maxWidth: 480,
                padding: '32px 28px',
                background: t.raised,
                borderRadius: 24,
                ...sh.raised,
              }}
            >
              {/* Signup heading */}
              <div style={{ marginBottom: 28 }}>
                <h2
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: t.text1,
                    margin: '0 0 6px',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Create Account
                </h2>
                <p style={{ fontSize: 13.5, color: t.text3, margin: 0 }}>
                  Join the community building better cities 🌆
                </p>
              </div>

              <form
                onSubmit={handleSignUp}
                style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
              >
                {/* Full Name */}
                <div>
                  <label htmlFor="su-full-name" style={labelStyle}>
                    Full Name
                  </label>
                  <input
                    id="su-full-name"
                    name="full_name"
                    type="text"
                    required
                    placeholder="John Doe"
                    onFocus={() => setFocused('su_name')}
                    onBlur={() => setFocused(null)}
                    style={inputStyle('su_name')}
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="su-email" style={labelStyle}>
                    Email Address
                  </label>
                  <input
                    id="su-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    onFocus={() => setFocused('su_email')}
                    onBlur={() => setFocused(null)}
                    style={inputStyle('su_email')}
                  />
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="su-password" style={labelStyle}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="su-password"
                      name="password"
                      type={showSignupPw ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      onFocus={() => setFocused('su_pw')}
                      onBlur={() => setFocused(null)}
                      style={{ ...inputStyle('su_pw'), paddingRight: 52 }}
                    />
                    <button
                      type="button"
                      aria-label={showSignupPw ? 'Hide password' : 'Show password'}
                      onClick={() => setShowSignupPw(v => !v)}
                      style={{
                        position: 'absolute',
                        right: 14,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: t.text3,
                        display: 'flex',
                        padding: 4,
                      }}
                    >
                      {showSignupPw ? (
                        <EyeOff size={18} strokeWidth={1.8} />
                      ) : (
                        <Eye size={18} strokeWidth={1.8} />
                      )}
                    </button>
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: t.text3 }}>
                    Minimum 6 characters
                  </p>
                </div>

                {/* CTA */}
                <button
                  type="submit"
                  disabled={signupLoading}
                  style={{
                    width: '100%',
                    padding: '15px',
                    borderRadius: 16,
                    background: signupLoading
                      ? t.base
                      : `linear-gradient(145deg, ${t.accent}, ${t.accentDark})`,
                    color: signupLoading ? t.text3 : '#fff',
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    border: hc ? `2px solid ${t.accentDark}` : 'none',
                    boxShadow:
                      hc || signupLoading
                        ? 'none'
                        : `5px 5px 12px ${t.shD}, -4px -4px 10px ${t.shL}`,
                    cursor: signupLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all 0.2s ease',
                    marginTop: 4,
                  }}
                >
                  {signupLoading ? (
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <>
                      <UserPlus size={17} strokeWidth={2} />
                      Join CivicTracker
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* ─── Switch to login ───────────────────────────────────── */}
            <p style={{ fontSize: 14, color: t.text3, textAlign: 'center', margin: 0 }}>
              Already have an account?{' '}
              <button
                onClick={() => { setTab('login'); setSignupError(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: t.accent,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  textDecoration: hc ? 'underline' : 'none',
                }}
              >
                Sign in here
              </button>
            </p>
          </>
        )}
      </div>

      {/* ─── Inline styles ─────────────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0%   { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          input::placeholder {
            color: #888780;
            opacity: 1;
          }
          [role="button"]:focus-visible {
            outline: 2px solid #1D9E75;
            outline-offset: 2px;
          }
        `,
      }} />
    </div>
  );
}
