'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import { Trophy, Zap, Gift, TrendingUp, Award } from 'lucide-react';
import type { Reward } from '@/lib/types/database';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  base:       '#EDEBE4',
  raised:     '#F5F3EC',
  border:     '#DDD9CE',
  text1:      '#2C2C2A',
  text2:      '#5F5E5A',
  text3:      '#888780',
  accent:     '#1D9E75',
  accentDark: '#167A5B',
  accentTint: '#E1F5EE',
  shL: 'rgba(255,255,255,0.75)',
  shD: 'rgba(0,0,0,0.09)',
} as const;

const SH = {
  raised:   `8px 8px 16px ${T.shD}, -8px -8px 16px ${T.shL}`,
  raisedSm: `4px 4px 8px ${T.shD}, -4px -4px 8px ${T.shL}`,
  inset:    `inset 5px 5px 10px ${T.shD}, inset -5px -5px 10px ${T.shL}`,
};

export default function RewardsPage() {
  const { user, loading: authLoading } = useAuth();
  const [allRewards, setAllRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    async function fetchRewards() {
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const q = query(collection(db, 'rewards'), where('user_id', '==', user!.uid));
        const snapshot = await getDocs(q);
        const rewards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        rewards.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setAllRewards(rewards as any[]);
      } catch (error) {
        console.error('Error fetching rewards:', error);
        setAllRewards([]);
      } finally {
        setLoading(false);
      }
    }
    fetchRewards();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100dvh', background: T.base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.accent, animation: 'spin 0.8s linear infinite' }} />
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
      </div>
    );
  }

  if (!user) return null;

  const totalPoints = allRewards.reduce((sum, r) => sum + r.points, 0);
  const thisMonth = allRewards.filter(r => {
    const d = new Date(r.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((sum, r) => sum + r.points, 0);

  const tiers = [
    { name: 'Bronze',   min: 0,    max: 200,     emoji: '🥉', benefit: 'Basic reporter badge',   bg: '#FAECE7', fg: '#712B13' },
    { name: 'Silver',   min: 200,  max: 500,      emoji: '🥈', benefit: 'Priority support',       bg: '#F0EEE8', fg: T.text2 },
    { name: 'Gold',     min: 500,  max: 1000,     emoji: '🥇', benefit: 'Tax credit eligibility', bg: '#FAEEDA', fg: '#854F0B' },
    { name: 'Platinum', min: 1000, max: Infinity, emoji: '🏆', benefit: 'Full civic tax offset',  bg: T.accentTint, fg: T.accentDark },
  ];
  const currentTierIdx = tiers.findIndex(t => totalPoints >= t.min && totalPoints < t.max);
  const currentTier = tiers[currentTierIdx >= 0 ? currentTierIdx : 0];
  const nextTier = tiers[currentTierIdx + 1];
  const progress = nextTier
    ? Math.min(((totalPoints - currentTier.min) / (nextTier.min - currentTier.min)) * 100, 100)
    : 100;

  const rewardIcons: Record<string, string> = { report: '📍', resolve: '✅', bonus: '🎁', streak: '🔥', default: '⭐' };
  const getIcon = (reason: string) =>
    Object.entries(rewardIcons).find(([k]) => reason.toLowerCase().includes(k))?.[1] ?? rewardIcons.default;

  return (
    <div style={{
      minHeight: '100dvh',
      background: T.base,
      fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
      color: T.text1,
      paddingBottom: 100,
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px' }}>

        {/* Header */}
        <div style={{ padding: '32px 0 24px' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 4px', color: T.text1 }}>
            Citizen Rewards
          </h1>
          <p style={{ fontSize: 13, color: T.text3, margin: 0, fontWeight: 500 }}>
            Unlock benefits by improving your city
          </p>
        </div>

        {/* Level card — teal gradient hero */}
        <div style={{
          borderRadius: 28, padding: '28px', marginBottom: 20,
          background: `linear-gradient(145deg, ${T.accent}, ${T.accentDark})`,
          boxShadow: `${SH.raised}, 0 12px 40px ${T.accent}40`,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -30, right: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
          <div style={{ position: 'absolute', bottom: -25, left: 30, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Award size={13} color="rgba(255,255,255,0.8)" />
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>CUMULATIVE SCORE</span>
                </div>
                <div style={{ fontSize: 52, fontWeight: 900, color: 'white', letterSpacing: '-0.05em', lineHeight: 1 }}>{totalPoints.toLocaleString()}</div>
                <div style={{ fontSize: 14, color: 'white', marginTop: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18 }}>{currentTier.emoji}</span> {currentTier.name} Status
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700, marginBottom: 4 }}>MONTHLY GAIN</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'white', letterSpacing: '-0.03em' }}>+{thisMonth}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>XP UNLOCKED</div>
              </div>
            </div>

            {nextTier ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-end' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                    {nextTier.min - totalPoints} XP until {nextTier.name}
                  </span>
                  <span style={{ fontSize: 11, color: 'white', fontWeight: 900 }}>{Math.round(progress)}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, borderRadius: 99, background: 'white', transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ marginTop: 10, fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>
                  🎁 UPCOMING: {nextTier.benefit.toUpperCase()}
                </div>
              </div>
            ) : (
              <div style={{
                padding: '12px 16px', borderRadius: 14,
                background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
                fontSize: 12, color: 'white', fontWeight: 800, textAlign: 'center',
              }}>
                🏆 MAX LEVEL ACHIEVED · ELIGIBLE FOR TAX OFFSETS
              </div>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[
            { icon: Zap,  label: 'Total Points', value: totalPoints,       bg: '#FAEEDA', fg: '#854F0B' },
            { icon: Gift, label: 'Submissions',  value: allRewards.length, bg: T.accentTint, fg: T.accentDark },
          ].map(({ icon: Icon, label, value, bg, fg }) => (
            <div key={label} style={{
              borderRadius: 20, padding: '20px 18px',
              background: T.raised, boxShadow: SH.raised,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12, boxShadow: SH.raisedSm,
              }}>
                <Icon size={18} color={fg} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: T.text1, letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tier Badges */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
            Progression Pathway
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {tiers.map(t => {
              const earned = totalPoints >= t.min;
              const isCurrent = currentTier.name === t.name;
              return (
                <div key={t.name} style={{
                  borderRadius: 18, padding: '14px 8px', textAlign: 'center',
                  background: isCurrent ? t.bg : T.raised,
                  border: isCurrent ? `2px solid ${t.fg}55` : `1px solid ${T.border}`,
                  boxShadow: isCurrent ? SH.inset : SH.raisedSm,
                  position: 'relative',
                }}>
                  {isCurrent && (
                    <div style={{
                      position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)',
                      fontSize: 7, fontWeight: 900, background: t.fg, color: 'white',
                      padding: '3px 7px', borderRadius: 99, whiteSpace: 'nowrap', letterSpacing: '0.08em',
                    }}>
                      ACTIVE
                    </div>
                  )}
                  <div style={{ fontSize: 28, marginBottom: 8, opacity: earned ? 1 : 0.25, filter: earned ? 'none' : 'grayscale(1)' }}>
                    {t.emoji}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: earned ? T.text1 : T.text3 }}>
                    {t.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reward Log */}
        <div>
          <div style={{
            fontSize: 11, fontWeight: 800, color: T.text3, textTransform: 'uppercase',
            letterSpacing: '0.1em', marginBottom: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={12} color={T.accent} /> Reward Registry
            </span>
            <span style={{ fontSize: 10 }}>LAST 30 DAYS</span>
          </div>

          {allRewards.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '56px 20px',
              background: T.raised, borderRadius: 24, boxShadow: SH.inset,
            }}>
              <div style={{ fontSize: 44, marginBottom: 14, opacity: 0.4 }}>⭐</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: T.text1, marginBottom: 8 }}>Foundations Set</div>
              <div style={{ fontSize: 13, color: T.text3, lineHeight: 1.5 }}>
                Your first reward will be deposited after your first report is resolved.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {allRewards.map(reward => (
                <div key={reward.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                  borderRadius: 20, background: T.raised, boxShadow: SH.raisedSm,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14,
                    background: T.accentTint, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: 22, boxShadow: SH.raisedSm,
                  }}>
                    {getIcon(reward.reason)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {reward.reason}
                    </div>
                    <div style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>
                      {new Date(reward.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 15, fontWeight: 900, color: T.accentDark,
                    background: T.accentTint, padding: '5px 12px', borderRadius: 10,
                    letterSpacing: '-0.02em', boxShadow: SH.raisedSm,
                  }}>
                    +{reward.points}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 40, opacity: 0.25 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', color: T.text2 }}>CITY REWARD NETWORK</div>
          <div style={{ fontSize: 9, marginTop: 4, color: T.text3 }}>AUTHENTICITY VERIFIED BY DISTRICT ADMIN</div>
        </div>
      </div>
    </div>
  );
}
