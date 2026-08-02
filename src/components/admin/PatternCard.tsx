'use client';

import React from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Droplet,
  Wrench,
  Trash2,
  Lightbulb,
  Zap,
  Clock,
  Layers,
  ShieldCheck,
  Loader2
} from 'lucide-react';

interface PatternCardProps {
  pattern: any;
  onViewDetail: (pattern: any) => void;
  onResolve: (patternId: string) => void;
  loadingId?: string | null;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'water-leakage': <Droplet className="w-6 h-6 text-blue-500" />,
  'water leakage': <Droplet className="w-6 h-6 text-blue-500" />,
  'water': <Droplet className="w-6 h-6 text-blue-500" />,
  'roads': <Wrench className="w-6 h-6 text-amber-500" />,
  'road': <Wrench className="w-6 h-6 text-amber-500" />,
  'electricity': <Zap className="w-6 h-6 text-yellow-500" />,
  'garbage': <Trash2 className="w-6 h-6 text-emerald-500" />,
  'sanitation': <Trash2 className="w-6 h-6 text-emerald-500" />,
  'streetlights': <Lightbulb className="w-6 h-6 text-rose-500" />,
  'default': <AlertTriangle className="w-6 h-6 text-purple-500" />
};

export default function PatternCard({
  pattern,
  onViewDetail,
  onResolve,
  loadingId
}: PatternCardProps) {
  const catKey = (pattern.category_id || '').toLowerCase();
  const Icon = CATEGORY_ICONS[catKey] || CATEGORY_ICONS.default;

  const daysUntilNext = pattern.predicted_next_at
    ? Math.round(
        (new Date(pattern.predicted_next_at).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  const isResolving = loadingId === pattern.id;

  // Severity Badge Colors
  const getSeverityBadgeClass = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-500 text-white';
      case 'HIGH':
        return 'bg-red-500 text-white';
      case 'MEDIUM':
        return 'bg-amber-500 text-white';
      default:
        return 'bg-emerald-500 text-white';
    }
  };

  const riskScore = Math.min(100, Math.max(0, pattern.risk_score || 0));

  // Circular Score Ring Calculations
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (riskScore / 100) * circumference;

  const getRingColor = (score: number) => {
    if (score >= 70) return '#ef4444'; // Red
    if (score >= 40) return '#f59e0b'; // Amber
    return '#10b981'; // Green
  };

  // XAI Breakdown Factors
  const breakdown = pattern.score_breakdown || {
    occurrenceCount: Math.round(riskScore * 0.35),
    frequency: Math.round(riskScore * 0.35),
    trendBonus: Math.round(riskScore * 0.2),
    categoryWeight: Math.round(riskScore * 0.1),
    total: riskScore
  };

  const totalScore = Math.max(1, riskScore);
  const pCount = Math.min(100, Math.max(0, (breakdown.occurrenceCount / totalScore) * 100));
  const pFreq = Math.min(100, Math.max(0, (breakdown.frequency / totalScore) * 100));
  const pTrend = Math.min(100, Math.max(0, (breakdown.trendBonus / totalScore) * 100));
  const pCat = Math.min(100, Math.max(0, (breakdown.categoryWeight / totalScore) * 100));

  // Format Prediction Date
  const formatPredictionDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <article
      aria-label={`${pattern.category_id} Infrastructure Pattern`}
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow p-5 sm:p-6 flex flex-col gap-4.5 w-full max-w-4xl mx-auto font-sans"
    >
      {/* ── HEADER ── */}
      <header className="flex items-start justify-between gap-4">
        {/* Left: Icon, Title, Badge & Subtitle */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-center shrink-0 shadow-2xs">
            {Icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-2.5">
              <h3 className="text-xl font-extrabold text-slate-900 capitalize tracking-tight leading-snug">
                {pattern.category_id} Infrastructure Pattern
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${getSeverityBadgeClass(
                  pattern.severity_level
                )}`}
              >
                {pattern.severity_level}
              </span>
            </div>

            <p className="mt-1 text-xs font-semibold text-slate-500">
              Cluster area near ({pattern.cluster_lat?.toFixed(4)}, {pattern.cluster_lng?.toFixed(4)})
            </p>
          </div>
        </div>

        {/* Right: Circular Risk Score */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
            <svg className="w-12 h-12 -rotate-90 transform" viewBox="0 0 54 54">
              <circle
                cx="27"
                cy="27"
                r={radius}
                className="stroke-slate-100"
                strokeWidth="4.5"
                fill="transparent"
              />
              <circle
                cx="27"
                cy="27"
                r={radius}
                stroke={getRingColor(riskScore)}
                strokeWidth="4.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
            </svg>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              RISK SCORE
            </span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {riskScore}
              </span>
              <span className="text-xs font-bold text-slate-400">/100</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── KPI GRID ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 my-1">
        {/* 1. Occurrences */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 flex flex-col gap-1.5 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 tracking-wider uppercase">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>OCCURRENCES</span>
          </div>
          <div className="text-lg font-black text-slate-900 tracking-tight">
            {pattern.occurrence_count} Incidents
          </div>
        </div>

        {/* 2. Interval */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 flex flex-col gap-1.5 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 tracking-wider uppercase">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>INTERVAL</span>
          </div>
          <div className="text-lg font-black text-slate-900 tracking-tight">
            ~{pattern.median_interval_days} Days
          </div>
        </div>

        {/* 3. Trend */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 flex flex-col gap-1.5 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 tracking-wider uppercase">
            {pattern.trend === 'INCREASING' ? (
              <TrendingUp className="w-3.5 h-3.5 text-red-500" />
            ) : pattern.trend === 'DECREASING' ? (
              <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Minus className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span>TREND</span>
          </div>
          <div className="text-lg font-black text-slate-900 tracking-tight">
            {pattern.trend === 'INCREASING'
              ? 'Accelerating'
              : pattern.trend === 'DECREASING'
              ? 'Slowing'
              : 'Stable'}
          </div>
        </div>

        {/* 4. Confidence */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 flex flex-col gap-1.5 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 tracking-wider uppercase">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
            <span>CONFIDENCE</span>
          </div>
          <div className="text-lg font-black text-slate-900 tracking-tight">
            {pattern.prediction_confidence}% Wilson
          </div>
        </div>
      </section>

      {/* ── PREDICTION BANNER ── */}
      <section className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-3 px-4 flex items-center justify-between gap-2 shadow-2xs my-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-base leading-none">🗓️</span>
          <div className="text-xs sm:text-sm font-extrabold text-amber-950 uppercase tracking-wide truncate">
            NEXT EXPECTED FAILURE:{' '}
            <span className="font-bold normal-case">
              Expected in {daysUntilNext > 0 ? `${daysUntilNext} Days` : 'Overdue'} ({formatPredictionDate(pattern.predicted_next_at)})
            </span>
          </div>
        </div>

        {pattern.seasonal_decomposition_applied && (
          <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-extrabold tracking-wide border border-purple-200 shrink-0">
            Seasonal Index: {pattern.seasonal_index}
          </span>
        )}
      </section>

      {/* ── EXPLAINABLE AI (XAI) RISK BREAKDOWN ── */}
      <section className="bg-white rounded-xl border border-slate-200/90 p-4.5 shadow-2xs flex flex-col gap-4 my-1">
        <h4 className="text-xs font-extrabold text-slate-800 tracking-wider uppercase">
          EXPLAINABLE AI (XAI) RISK BREAKDOWN
        </h4>

        {/* 2x2 Progress Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
          {/* Row 1, Left: Occurrences */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-sm font-bold text-slate-900">
              <span>Occurrences</span>
              <span>{breakdown.occurrenceCount}</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${pCount}%` }}
              />
            </div>
          </div>

          {/* Row 1, Right: Frequency */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-sm font-bold text-slate-900">
              <span>Frequency</span>
              <span>{breakdown.frequency}</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${pFreq}%` }}
              />
            </div>
          </div>

          {/* Row 2, Left: Trend Velocity */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-sm font-bold text-slate-900">
              <span>Trend Velocity</span>
              <span>{breakdown.trendBonus}</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all duration-500"
                style={{ width: `${pTrend}%` }}
              />
            </div>
          </div>

          {/* Row 2, Right: Category Weight */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-sm font-bold text-slate-900">
              <span>Category Weight</span>
              <span>{breakdown.categoryWeight}</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${pCat}%` }}
              />
            </div>
          </div>
        </div>

        {/* Formula Footnote */}
        <div className="text-xs font-semibold text-slate-500 pt-3 border-t border-slate-100">
          Risk Formula = Count({breakdown.occurrenceCount}) + Frequency({breakdown.frequency}) + Trend({breakdown.trendBonus}) + Category({breakdown.categoryWeight})
        </div>
      </section>

      {/* ── ACTION BUTTONS ── */}
      <footer className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200/80 mt-1">
        <button
          type="button"
          onClick={() => onViewDetail(pattern)}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg border border-slate-200/80 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
        >
          View History <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
        </button>

        <button
          type="button"
          onClick={() => onResolve(pattern.id)}
          disabled={isResolving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-60"
        >
          {isResolving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              Resolving...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              Mark Resolved
            </>
          )}
        </button>
      </footer>
    </article>
  );
}