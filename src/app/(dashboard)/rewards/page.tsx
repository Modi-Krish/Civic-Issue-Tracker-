'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import { Trophy, Star, TrendingUp, Gift, Zap, ChevronRight, Award } from 'lucide-react';
import type { Reward } from '@/lib/types/database';

export default function RewardsPage() {
  const { user, loading: authLoading } = useAuth();
  const [allRewards, setAllRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    async function fetchRewards() {
      try {
        const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');

        const q = query(
          collection(db, 'rewards'), 
          where('user_id', '==', user!.uid)
        );

        const snapshot = await getDocs(q);
        const rewards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        rewards.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setAllRewards(rewards as any[]);
      } catch (error) {
        console.error("Error fetching rewards:", error);
        setAllRewards([]);
      } finally {
        setLoading(false);
      }
    }
    fetchRewards();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d0d0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#FF2E11', animation: 'spin 0.8s linear infinite' }} />
        
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
    { name: "Bronze",   min: 0,    max: 200,      color: "#cd7f32", emoji: "🥉", benefit: "Basic reporter badge" },
    { name: "Silver",   min: 200,  max: 500,       color: "#9ca3af", emoji: "🥈", benefit: "Priority support" },
    { name: "Gold",     min: 500,  max: 1000,      color: "#fbbf24", emoji: "🥇", benefit: "Tax credit eligibility" },
    { name: "Platinum", min: 1000, max: Infinity,  color: "#FF2E11", emoji: "🏆", benefit: "Full civic tax offset" },
  ];
  const currentTierIdx = tiers.findIndex(t => totalPoints >= t.min && totalPoints < t.max);
  const currentTier = tiers[currentTierIdx >= 0 ? currentTierIdx : 0];
  const nextTier = tiers[currentTierIdx + 1];
  const progress = nextTier
    ? Math.min(((totalPoints - currentTier.min) / (nextTier.min - currentTier.min)) * 100, 100)
    : 100;

  const rewardIcons: Record<string, string> = {
    report: "📍", resolve: "✅", bonus: "🎁", streak: "🔥", default: "⭐",
  };
  const getIcon = (reason: string) =>
    Object.entries(rewardIcons).find(([k]) => reason.toLowerCase().includes(k))?.[1] ?? rewardIcons.default;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0f", fontFamily: "'Inter', -apple-system, sans-serif", color: "#ffffff", paddingBottom: 100 }}>
      {/* ambient */}
       <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -80, right: "10%", width: 400, height: 300, background: "radial-gradient(ellipse, rgba(255, 46, 17, 0.06) 0%, transparent 70%)", borderRadius: "50%" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 480, margin: "0 auto", padding: "0 16px" }}>

        {/* Header */}
        <div style={{ padding: "32px 0 24px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 4px" }}>Citizen Rewards</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0, fontWeight: 500 }}>Unlock benefits by improving your city</p>
        </div>

        {/* Level Card */}
        <div style={{ borderRadius: 28, padding: "28px", marginBottom: 20, background: "linear-gradient(135deg, #FF2E11 0%, #A79277 100%)", boxShadow: "0 12px 48px rgba(255, 46, 17, 0.4)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -30, right: -20, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />
          <div style={{ position: "absolute", bottom: -25, left: 30, width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                   <Award size={14} color="white" />
                   <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: "0.12em" }}>CUMULATIVE SCORE</span>
                </div>
                <div style={{ fontSize: 62, fontWeight: 900, color: "white", letterSpacing: "-0.05em", lineHeight: 1 }}>{totalPoints.toLocaleString()}</div>
                <div style={{ fontSize: 14, color: "white", marginTop: 8, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                   <span style={{ fontSize: 18 }}>{currentTier.emoji}</span> {currentTier.name} Status
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 700, marginBottom: 4 }}>MONTHLY GAIN</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "white", letterSpacing: "-0.03em" }}>+{thisMonth}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>XP UNLOCKED</div>
              </div>
            </div>
            {nextTier ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "flex-end" }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
                    {nextTier.min - totalPoints} XP until {nextTier.name}
                  </span>
                  <span style={{ fontSize: 11, color: "white", fontWeight: 900 }}>{Math.round(progress)}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,0.2)", overflow: "hidden", border: "0.5px solid rgba(255,255,255,0.15)" }}>
                  <div style={{ height: "100%", width: `${progress}%`, borderRadius: 99, background: "white", transition: "width 0.6s ease" }} />
                </div>
                <div style={{ marginTop: 10, fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>🎁</div>
                  UPCOMING: {nextTier.benefit?.toUpperCase()}
                </div>
              </div>
            ) : (
              <div style={{ padding: "12px 16px", borderRadius: 14, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", fontSize: 12, color: "white", fontWeight: 800, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                🏆 MAX LEVEL ACHIEVED · ELIGIBLE FOR TAX OFFSETS
              </div>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[
            { icon: Zap, label: "Total Points", value: totalPoints, color: "#fbbf24", bg: "rgba(251, 191, 36, 0.08)" },
            { icon: Gift, label: "Submissions", value: allRewards.length, color: "#FF2E11", bg: "rgba(255, 46, 17, 0.08)" },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} style={{ borderRadius: 20, padding: "20px 18px", background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.06)` }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Icon size={18} color={color} />
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Milestone Badges */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Progression Pathway</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {tiers.map(t => {
              const earned = totalPoints >= t.min;
              const isCurrent = currentTier.name === t.name;
              return (
                <div key={t.name} style={{ borderRadius: 18, padding: "16px 8px", textAlign: "center", background: earned ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.01)", border: isCurrent ? `2px solid #FF2E11` : earned ? `1px solid rgba(255, 255, 255, 0.1)` : "1px solid rgba(255,255,255,0.03)", position: "relative" }}>
                  {isCurrent && (
                    <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", fontSize: 7, fontWeight: 900, background: "#FF2E11", color: "white", padding: "3px 6px", borderRadius: 99, whiteSpace: "nowrap", letterSpacing: "0.1em" }}>
                      ACTIVE
                    </div>
                  )}
                  <div style={{ fontSize: 28, marginBottom: 8, opacity: earned ? 1 : 0.2, filter: earned ? "none" : "grayscale(1)" }}>{t.emoji}</div>
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: earned ? "white" : "rgba(255,255,255,0.2)" }}>{t.name}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline Log */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><TrendingUp size={12} color="#FF2E11" /> REWARD REGISTRY</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>LAST 30 DAYS</span>
          </div>

          {allRewards.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", borderRadius: 24, border: "1.5px dashed rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
              <div style={{ fontSize: 44, marginBottom: 16, opacity: 0.3 }}>⭐</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "white", marginBottom: 8 }}>Foundations Set</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>Resolution tracking is active. Your first reward will be automatically deposited after your first report is resolved.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {allRewards.map((reward) => (
                <div key={reward.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 24 }}>
                    {getIcon(reward.reason)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{reward.reason}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>
                      {new Date(reward.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#10b981", background: "rgba(16, 185, 129, 0.12)", padding: "5px 12px", borderRadius: 10, letterSpacing: "-0.02em", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                    +{reward.points}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 40, opacity: 0.15 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em" }}>CITY REWARD NETWORK</div>
            <div style={{ fontSize: 9, marginTop: 4 }}>AUTHENTICITY VERIFIED BY DISTRICT ADMIN</div>
        </div>
      </div>
    </div>
  );
}
