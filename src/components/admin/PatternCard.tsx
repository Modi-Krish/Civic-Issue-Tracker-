'use client';

import React from 'react';
import {
  AlertTriangle,
  Calendar,
  MapPin,
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
  Loader2,
  Info
} from 'lucide-react';

interface PatternCardProps {
  pattern: any;
  onViewDetail: (pattern: any) => void;
  onResolve: (patternId: string) => void;
  loadingId?: string | null;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'water-leakage': <Droplet className="w-5 h-5 text-blue-600" />,
  'water leakage': <Droplet className="w-5 h-5 text-blue-600" />,
  'water': <Droplet className="w-5 h-5 text-blue-600" />,
  'roads': <Wrench className="w-5 h-5 text-amber-600" />,
  'road': <Wrench className="w-5 h-5 text-amber-600" />,
  'electricity': <Zap className="w-5 h-5 text-yellow-600" />,
  'garbage': <Trash2 className="w-5 h-5 text-emerald-600" />,
  'sanitation': <Trash2 className="w-5 h-5 text-emerald-600" />,
  'streetlights': <Lightbulb className="w-5 h-5 text-rose-600" />,
  'default': <AlertTriangle className="w-5 h-5 text-purple-600" />
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

  const isUrgentNext = daysUntilNext <= 14;
  const isResolving = loadingId === pattern.id;

  // Severity Left Border & Badge Styling
  const getSeverityStyles = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return {
          border: 'border-l-red-500',
          badgeBg: 'bg-red-50 text-red-700 border-red-200',
          scoreColor: '#ef4444',
          ringColor: 'stroke-red-500'
        };
      case 'HIGH':
        return {
          border: 'border-l-orange-500',
          badgeBg: 'bg-orange-50 text-orange-700 border-orange-200',
          scoreColor: '#f97316',
          ringColor: 'stroke-orange-500'
        };
      case 'MEDIUM':
        return {
          border: 'border-l-amber-500',
          badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
          scoreColor: '#f59e0b',
          ringColor: 'stroke-amber-500'
        };
      default:
        return {
          border: 'border-l-emerald-500',
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          scoreColor: '#10b981',
          ringColor: 'stroke-emerald-500'
        };
    }
  };

  const severityStyles = getSeverityStyles(pattern.severity_level);

  // Dynamic Score Ring Color Calculation
  const getScoreRingColor = (score: number) => {
    if (score >= 70) return { stroke: '#ef4444', text: 'text-red-600' };
    if (score >= 40) return { stroke: '#f59e0b', text: 'text-amber-600' };
    return { stroke: '#10b981', text: 'text-emerald-600' };
  };

  const scoreColorObj = getScoreRingColor(pattern.risk_score || 0);

  // SVG Circular Ring Calculation
  const riskScore = Math.min(100, Math.max(0, pattern.risk_score || 0));
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (riskScore / 100) * circumference;

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
      className={`relative bg-white rounded-2xl border border-gray-200 border-l-[6px] ${severityStyles.border} shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden p-5 sm:p-6 flex flex-col gap-6 w-full`}
    >
      {/* ── HEADER SECTION ── */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
            {Icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <h3 className="text-[19px] sm:text-xl font-bold text-slate-900 capitalize tracking-tight truncate">
                {pattern.category_id} Infrastructure Pattern
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${severityStyles.badgeBg}`}
              >
                {pattern.severity_level}
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate">
                {pattern.location_description ||
                  `Centroid (${pattern.cluster_lat?.toFixed(4)}, ${pattern.cluster_lng?.toFixed(4)})`}
              </span>
            </p>
          </div>
        </div>

        {/* Circular Risk Score Ring */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/70 p-2.5 px-3.5 rounded-2xl shrink-0 self-end sm:self-auto shadow-2xs">
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-14 h-14 -rotate-90 transform" viewBox="0 0 60 60">
              {/* Background Circle */}
              <circle
                cx="30"
                cy="30"
                r={radius}
                className="stroke-slate-200"
                strokeWidth="5"
                fill="transparent"
              />
              {/* Animated Value Progress Circle */}
              <circle
                cx="30"
                cy="30"
                r={radius}
                stroke={scoreColorObj.stroke}
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Inner Ring Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
              <span className={`text-base font-black tracking-tight ${scoreColorObj.text}`}>
                {riskScore}
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Risk
              </span>
            </div>
          </div>
          
          <div className="hidden xs:flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Risk Score
            </span>
            <span className="text-xs font-extrabold text-slate-700">
              {riskScore} / 100
            </span>
          </div>
        </div>
      </header>

      {/* ── KPI MINI CARDS GRID ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 1. Occurrences */}
        <div className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 rounded-xl p-3.5 flex flex-col justify-between transition-colors shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Occurrences
            </span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {pattern.occurrence_count}{' '}
            <span className="text-xs font-semibold text-slate-500">Incidents</span>
          </div>
        </div>

        {/* 2. Interval */}
        <div className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 rounded-xl p-3.5 flex flex-col justify-between transition-colors shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Interval
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            ~{pattern.median_interval_days}{' '}
            <span className="text-xs font-semibold text-slate-500">Days</span>
          </div>
        </div>

        {/* 3. Trend */}
        <div className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 rounded-xl p-3.5 flex flex-col justify-between transition-colors shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Trend
            </span>
            {pattern.trend === 'INCREASING' ? (
              <TrendingUp className="w-4 h-4 text-red-500" />
            ) : pattern.trend === 'DECREASING' ? (
              <TrendingDown className="w-4 h-4 text-emerald-500" />
            ) : (
              <Minus className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <div
            className={`text-base sm:text-lg font-bold tracking-tight ${
              pattern.trend === 'INCREASING'
                ? 'text-red-600'
                : pattern.trend === 'DECREASING'
                ? 'text-emerald-600'
                : 'text-amber-600'
            }`}
          >
            {pattern.trend === 'INCREASING'
              ? 'Accelerating'
              : pattern.trend === 'DECREASING'
              ? 'Slowing'
              : 'Stable'}
          </div>
        </div>

        {/* 4. Confidence */}
        <div className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 rounded-xl p-3.5 flex flex-col justify-between transition-colors shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Confidence
            </span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-base sm:text-lg font-bold text-purple-700 tracking-tight">
            {pattern.prediction_confidence}%{' '}
            <span className="text-xs font-semibold text-slate-500">Wilson</span>
          </div>
        </div>
      </section>

      {/* ── PREDICTION CARD ── */}
      <section
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
          isUrgentNext
            ? 'bg-amber-50/80 border-amber-200 text-amber-950'
            : 'bg-blue-50/60 border-blue-100 text-blue-950'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isUrgentNext
                ? 'bg-amber-100 text-amber-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            <Calendar className="w-5 h-5" />
          </div>

          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              📅 Next Expected Failure
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
              {daysUntilNext > 0
                ? `Expected in ${daysUntilNext} Days`
                : 'Overdue Recurrence'}{' '}
              <span className="text-xs font-normal text-slate-600">
                ({formatPredictionDate(pattern.predicted_next_at)})
              </span>
            </div>
          </div>
        </div>

        {pattern.seasonal_decomposition_applied && (
          <span className="self-start sm:self-auto px-3 py-1 rounded-lg bg-purple-100 border border-purple-200 text-purple-800 text-[11px] font-extrabold tracking-wide">
            Seasonal Index: {pattern.seasonal_index}
          </span>
        )}
      </section>

      {/* ── AI RISK BREAKDOWN (XAI STACKED PROGRESS ROWS) ── */}
      <section className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            Explainable AI (XAI) Risk Breakdown
          </span>
          <span className="text-xs font-bold text-slate-700">
            Total Score: {riskScore} / 100
          </span>
        </div>

        {/* Stacked Factor Progress Rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 pt-1">
          {/* Factor 1: Occurrences */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">Occurrences</span>
              <span className="font-bold text-slate-900">{breakdown.occurrenceCount}</span>
            </div>
            <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${pCount}%` }}
                title={`Occurrences Contribution: ${breakdown.occurrenceCount}`}
              />
            </div>
          </div>

          {/* Factor 2: Frequency */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">Frequency</span>
              <span className="font-bold text-slate-900">{breakdown.frequency}</span>
            </div>
            <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${pFreq}%` }}
                title={`Frequency Contribution: ${breakdown.frequency}`}
              />
            </div>
          </div>

          {/* Factor 3: Trend Bonus */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">Trend Velocity</span>
              <span className="font-bold text-slate-900">{breakdown.trendBonus}</span>
            </div>
            <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-500"
                style={{ width: `${pTrend}%` }}
                title={`Trend Velocity Contribution: ${breakdown.trendBonus}`}
              />
            </div>
          </div>

          {/* Factor 4: Category Weight */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">Category Weight</span>
              <span className="font-bold text-slate-900">{breakdown.categoryWeight}</span>
            </div>
            <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${pCat}%` }}
                title={`Category Weight Contribution: ${breakdown.categoryWeight}`}
              />
            </div>
          </div>
        </div>

        {/* Formula Footnote */}
        <div className="text-[11px] font-medium text-slate-500 pt-1 border-t border-slate-200/50">
          Risk Formula = Count({breakdown.occurrenceCount}) + Frequency({breakdown.frequency}) + Trend({breakdown.trendBonus}) + Category({breakdown.categoryWeight})
        </div>
      </section>

      {/* ── ACTION BUTTONS ── */}
      <footer className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-200/80">
        <button
          type="button"
          onClick={() => onViewDetail(pattern)}
          className="flex-1 h-[46px] rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 border border-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer focus:ring-2 focus:ring-slate-400 focus:outline-none"
        >
          View History <ArrowRight className="w-4 h-4 text-slate-600" />
        </button>

        <button
          type="button"
          onClick={() => onResolve(pattern.id)}
          disabled={isResolving}
          className="flex-1 h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus:ring-2 focus:ring-emerald-400 focus:outline-none"
        >
          {isResolving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              Resolving...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              Mark Resolved
            </>
          )}
        </button>
      </footer>
    </article>
  );
}