'use client';

import React from 'react';
import {
  Droplet,
  AlertTriangle,
  Clock,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  ArrowRight,
  CircleCheck,
  Wrench,
  Trash2,
  Lightbulb,
  Zap,
  Loader2
} from 'lucide-react';

interface PatternCardProps {
  pattern: any;
  onViewDetail: (pattern: any) => void;
  onResolve: (patternId: string) => void;
  loadingId?: string | null;
}

const CATEGORY_ICONS: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  'water-leakage': { icon: <Droplet size={20} color="#185FA5" />, bg: '#E6F1FB', color: '#185FA5' },
  'water leakage': { icon: <Droplet size={20} color="#185FA5" />, bg: '#E6F1FB', color: '#185FA5' },
  'water': { icon: <Droplet size={20} color="#185FA5" />, bg: '#E6F1FB', color: '#185FA5' },
  'roads': { icon: <Wrench size={20} color="#854F0B" />, bg: '#FAEEDA', color: '#854F0B' },
  'road': { icon: <Wrench size={20} color="#854F0B" />, bg: '#FAEEDA', color: '#854F0B' },
  'electricity': { icon: <Zap size={20} color="#9A6B00" />, bg: '#FEF3C7', color: '#9A6B00' },
  'garbage': { icon: <Trash2 size={20} color="#0F6E56" />, bg: '#E6F4F1', color: '#0F6E56' },
  'sanitation': { icon: <Trash2 size={20} color="#0F6E56" />, bg: '#E6F4F1', color: '#0F6E56' },
  'streetlights': { icon: <Lightbulb size={20} color="#A32424" />, bg: '#FCE8E8', color: '#A32424' },
  'default': { icon: <AlertTriangle size={20} color="#5B21B6" />, bg: '#F3E8FF', color: '#5B21B6' }
};

// Risk gauge as an inline SVG ring
function RiskGauge({ score = 75, max = 100 }: { score: number; max?: number }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const progress = (Math.min(max, Math.max(0, score)) / max) * circumference;

  const strokeColor = score >= 70 ? '#E24B4A' : score >= 40 ? '#EF9F27' : '#0F6E56';

  return (
    <div className="flex flex-col items-center justify-center flex-shrink-0 text-center select-none">
      <svg width="56" height="56" viewBox="0 0 56 56" className="block">
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="#F0E4D4"
          strokeWidth="5"
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          transform="rotate(-90 28 28)"
        />
        <text
          x="28"
          y="27"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="15"
          fontWeight="600"
          fill="#2C2C2A"
        >
          {score}
        </text>
        <text
          x="28"
          y="39"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="8"
          fontWeight="500"
          fill="#918F84"
        >
          /{max}
        </text>
      </svg>
      <div className="text-[10px] font-medium text-[#918F84] tracking-wide mt-0.5 text-center leading-none">
        risk score
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-[#FCFBF7] p-3.5 px-4.5 flex flex-col justify-between min-w-0">
      <div className="text-[11px] text-[#918F84] flex items-center gap-1.5 uppercase tracking-wider font-medium leading-none">
        <Icon size={13} className="shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className="text-[15px] font-medium text-[#2C2C2A] mt-1.5 leading-snug truncate">
        {value}
      </div>
    </div>
  );
}

function FactorBar({ label, value, max = 30, color }: { label: string; value: number; max?: number; color: string }) {
  const pct = Math.min(100, Math.max(0, Math.round((value / Math.max(1, max)) * 100)));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[13px] leading-tight">
        <span className="text-[#2C2C2A] font-medium truncate">{label}</span>
        <span className="font-semibold text-[#2C2C2A] shrink-0 ml-2">{value}</span>
      </div>
      <div className="h-[5px] bg-[#F0EEE5] rounded-full overflow-hidden w-full">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function PatternCard({
  pattern,
  onViewDetail,
  onResolve,
  loadingId
}: PatternCardProps) {
  const catKey = (pattern.category_id || '').toLowerCase();
  const catStyle = CATEGORY_ICONS[catKey] || CATEGORY_ICONS.default;

  const riskScore = pattern.risk_score || 75;
  const severity = (pattern.severity_level || 'high').toLowerCase();
  const title = `${pattern.category_id || 'Water leakage'} infrastructure pattern`;
  const location =
    pattern.location_description ||
    `Cluster area near ${pattern.cluster_lat?.toFixed(4) || '22.3072'}, ${pattern.cluster_lng?.toFixed(4) || '73.1811'}`;

  const occurrences = pattern.occurrence_count || 5;
  const interval = `~${pattern.median_interval_days || 31} days`;

  const trendLabel =
    pattern.trend === 'INCREASING'
      ? 'Accelerating'
      : pattern.trend === 'DECREASING'
      ? 'Slowing'
      : 'Stable';

  const confidence = `${pattern.prediction_confidence || 97}% Wilson`;

  const daysUntilNext = pattern.predicted_next_at
    ? Math.round((new Date(pattern.predicted_next_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 2;

  const nextFailureDays = Math.max(0, daysUntilNext);
  const nextFailureDate = pattern.predicted_next_at
    ? new Date(pattern.predicted_next_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : '4 Aug 2026';

  const breakdown = pattern.score_breakdown || {
    occurrenceCount: Math.round(riskScore * 0.35),
    frequency: Math.round(riskScore * 0.35),
    trendBonus: Math.round(riskScore * 0.2),
    categoryWeight: Math.round(riskScore * 0.1),
    total: riskScore
  };

  const factors = {
    occurrences: breakdown.occurrenceCount ?? 26,
    frequency: breakdown.frequency ?? 26,
    trendVelocity: breakdown.trendBonus ?? 15,
    categoryWeight: breakdown.categoryWeight ?? 8
  };

  const isResolving = loadingId === pattern.id;

  const severityBadgeClass =
    severity === 'critical'
      ? 'bg-[#FCE8E8] text-[#A32424]'
      : severity === 'high'
      ? 'bg-[#FAEEDA] text-[#854F0B]'
      : severity === 'medium'
      ? 'bg-[#FEF3C7] text-[#9A6B00]'
      : 'bg-[#E6F4F1] text-[#0F6E56]';

  return (
    <div className="bg-[#EFEBE0] p-4 sm:p-6 rounded-2xl font-sans w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-[14px] border border-[#DEDACB] overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4 gap-4">
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            <div
              style={{ backgroundColor: catStyle.bg }}
              className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0 mt-0.5"
            >
              {catStyle.icon}
            </div>
            <div className="min-w-0 flex-1 leading-normal">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[16px] font-medium text-[#2C2C2A] capitalize leading-snug">
                  {title}
                </span>
                <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full capitalize leading-tight shrink-0 ${severityBadgeClass}`}>
                  {severity}
                </span>
              </div>
              <div className="text-[13px] text-[#79776E] mt-1 leading-normal truncate">
                {location}
              </div>
            </div>
          </div>
          <RiskGauge score={riskScore} />
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px border-y border-[#EAE6D9]">
          <Stat icon={Clock} label="occurrences" value={`${occurrences} incidents`} />
          <Stat icon={CalendarClock} label="interval" value={interval} />
          <Stat icon={TrendingUp} label="trend" value={trendLabel} />
          <Stat icon={Check} label="confidence" value={confidence} />
        </div>

        {/* Next expected failure banner */}
        <div className="mx-5 mt-4 bg-[#FAEEDA] border border-[#F0D9A8] rounded-[10px] px-3.5 py-2.5 flex items-center gap-2">
          <AlertTriangle size={16} color="#854F0B" className="flex-shrink-0" />
          <span className="text-[13px] text-[#633806] leading-snug">
            <span className="font-semibold">Next expected failure</span> — in{' '}
            {nextFailureDays} days, {nextFailureDate}
          </span>
        </div>

        {/* XAI breakdown */}
        <div className="px-5 pt-5 pb-2">
          <div className="text-[11px] font-medium tracking-wide text-[#918F84] mb-3.5 uppercase leading-none">
            EXPLAINABLE AI RISK BREAKDOWN
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <FactorBar
              label="Occurrences"
              value={factors.occurrences}
              max={30}
              color="#378ADD"
            />
            <FactorBar
              label="Frequency"
              value={factors.frequency}
              max={30}
              color="#EF9F27"
            />
            <FactorBar
              label="Trend velocity"
              value={factors.trendVelocity}
              max={30}
              color="#5DCAA5"
            />
            <FactorBar
              label="Category weight"
              value={factors.categoryWeight}
              max={30}
              color="#7F77DD"
            />
          </div>

          <div className="mt-4 text-[12px] text-[#918F84] font-mono leading-tight truncate">
            risk = count({factors.occurrences}) + frequency(
            {factors.frequency}) + trend({factors.trendVelocity}) + category(
            {factors.categoryWeight})
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-5 pt-4 pb-5 mt-3 border-t border-[#EAE6D9]">
          <button
            type="button"
            onClick={() => onViewDetail(pattern)}
            className="text-[13px] text-[#5F5E5A] font-medium flex items-center gap-1.5 hover:text-[#2C2C2A] transition-colors cursor-pointer"
          >
            <span>view history</span>
            <ArrowRight size={14} className="shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => onResolve(pattern.id)}
            disabled={isResolving}
            className="bg-[#0F6E56] text-white text-[13px] font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 hover:bg-[#085041] transition-colors cursor-pointer disabled:opacity-60 shrink-0"
          >
            {isResolving ? (
              <>
                <Loader2 size={15} className="animate-spin text-white shrink-0" />
                <span>resolving...</span>
              </>
            ) : (
              <>
                <CircleCheck size={15} className="shrink-0" />
                <span>mark resolved</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}