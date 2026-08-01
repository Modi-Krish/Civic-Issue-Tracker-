import { ANALYSIS_CONFIG } from './config';
import type { IssueCluster } from './spatialCluster';

export type TrendDirection = 'INCREASING' | 'STABLE' | 'DECREASING';
export type SeverityLevel  = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ScoreBreakdown {
  occurrenceCount: number;
  frequency:       number;
  trendBonus:      number;
  categoryWeight:  number;
  total:           number;
}

export interface ClusterMetrics {
  occurrence_count:       number;
  merged_event_count:     number;
  avg_interval_days:      number;
  median_interval_days:   number;
  last_occurrence_at:     Date;
  predicted_next_at:      Date;
  prediction_confidence:  number;
  risk_score:             number;
  severity_level:         SeverityLevel;
  trend:                  TrendDirection;
  score_breakdown:        ScoreBreakdown;
  recommendation_text:    string;
  intervals_days:         number[];
}

// ─── Median ──────────────────────────────────────────────────────────────────

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// ─── Wilson Score Confidence ──────────────────────────────────────────────────

/**
 * Computes Wilson Score lower bound for prediction confidence.
 * Applied to the empirical prediction accuracy rate (TP / total predictions).
 * When no prediction history exists (cold start), falls back to
 * conservative sample-size caps.
 */
export function wilsonScoreConfidence(
  predictionSuccesses: number,
  predictionAttempts:  number,
  occurrenceCount:     number,
  z: number = 1.96
): number {
  // Cold-start: no prior prediction history — use sample-size caps
  if (predictionAttempts === 0) {
    if (occurrenceCount < 3)  return 40;
    if (occurrenceCount === 3) return 52;
    if (occurrenceCount === 4) return 62;
    if (occurrenceCount <= 9)  return 78;
    return 98;
  }

  const pHat = predictionSuccesses / predictionAttempts;
  const n    = predictionAttempts;
  const numerator =
    pHat +
    (z * z) / (2 * n) -
    z * Math.sqrt((pHat * (1 - pHat)) / n + (z * z) / (4 * n * n));
  const denominator = 1 + (z * z) / n;
  return Math.min(98, Math.max(0, Math.round((numerator / denominator) * 100)));
}

// ─── Trend Detection ──────────────────────────────────────────────────────────

function detectTrend(intervals: number[]): TrendDirection {
  if (intervals.length < 3) return 'STABLE';
  const half    = Math.floor(intervals.length / 2);
  const recent  = median(intervals.slice(-half));
  const earlier = median(intervals.slice(0, half));
  if (recent < earlier * 0.85) return 'INCREASING';  // intervals shortening = more frequent
  if (recent > earlier * 1.15) return 'DECREASING';
  return 'STABLE';
}

// ─── Risk Score ────────────────────────────────────────────────────────────────

function computeRiskScore(
  occurrenceCount:    number,
  medianIntervalDays: number,
  trend:              TrendDirection,
  category_id:        string
): { score: number; breakdown: ScoreBreakdown } {
  const w = ANALYSIS_CONFIG.RISK_WEIGHTS;
  const catWeight =
    ANALYSIS_CONFIG.CATEGORY_WEIGHTS[category_id?.toLowerCase()] ??
    ANALYSIS_CONFIG.CATEGORY_WEIGHTS['default'];

  // Count score: 0–40 based on occurrence count (caps at 10 occurrences)
  const countScore = Math.min(40, occurrenceCount * 4);

  // Frequency score: 0–40 based on interval (shorter interval = higher score)
  // 7 days → 40, 30 days → 30, 90 days → 15, 180+ days → 0
  const freqScore = Math.max(0, Math.min(40, Math.round(40 * (1 - medianIntervalDays / 180))));

  // Trend bonus: 0–20 for accelerating failures
  const trendBonus = trend === 'INCREASING' ? 20 : trend === 'STABLE' ? 5 : 0;

  const rawScore = (w.w_count * countScore + w.w_freq * freqScore + w.w_trend * trendBonus) * catWeight;
  const total    = Math.min(100, Math.round(rawScore));

  return {
    score: total,
    breakdown: {
      occurrenceCount: Math.round(w.w_count * countScore * catWeight),
      frequency:       Math.round(w.w_freq  * freqScore  * catWeight),
      trendBonus:      Math.round(w.w_trend * trendBonus * catWeight),
      categoryWeight:  Math.round((catWeight - 1) * 10),
      total,
    },
  };
}

// ─── Severity ──────────────────────────────────────────────────────────────────

function deriveSeverity(riskScore: number): SeverityLevel {
  const t = ANALYSIS_CONFIG.SEVERITY_THRESHOLDS;
  if (riskScore >= t.CRITICAL) return 'CRITICAL';
  if (riskScore >= t.HIGH)     return 'HIGH';
  if (riskScore >= t.MEDIUM)   return 'MEDIUM';
  return 'LOW';
}

// ─── Recommendation ────────────────────────────────────────────────────────────

function generateRecommendation(
  occurrenceCount: number,
  severity:        SeverityLevel,
  trend:           TrendDirection
): string {
  if (severity === 'CRITICAL' || occurrenceCount >= 5)
    return 'Critical recurrence detected. Recommend immediate engineering audit and infrastructure replacement assessment.';
  if (trend === 'INCREASING')
    return 'Failure frequency is accelerating. Schedule priority preventive maintenance before next predicted occurrence.';
  if (severity === 'HIGH')
    return 'High recurrence risk. Schedule priority engineering audit and preventive maintenance.';
  if (severity === 'MEDIUM')
    return 'Moderate recurrence pattern. Add to next quarterly maintenance cycle.';
  return 'Low recurrence pattern. Monitor for further occurrences.';
}

// ─── Main Export ───────────────────────────────────────────────────────────────

export function computeClusterMetrics(
  cluster: IssueCluster,
  predictionSuccesses: number = 0,
  predictionAttempts:  number = 0
): ClusterMetrics | null {
  if (cluster.events.length < ANALYSIS_CONFIG.MIN_OCCURRENCES_TO_FLAG) return null;

  // Sort events chronologically
  const sorted = [...cluster.events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Calculate inter-arrival intervals in days
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const diffMs = new Date(sorted[i].created_at).getTime() -
                   new Date(sorted[i - 1].created_at).getTime();
    intervals.push(diffMs / (1000 * 60 * 60 * 24));
  }

  const avgInterval    = intervals.length > 0 ? intervals.reduce((s, v) => s + v, 0) / intervals.length : 30;
  const medianInterval = intervals.length > 0 ? median(intervals) : 30;

  // ISSUE 7: Interval Validation Guard
  if (medianInterval < 5 && intervals.length > 0) {
    console.warn(`⚠️ Potential duplicate bias detected (median interval ${medianInterval.toFixed(1)} days < 5 days) for cluster ${cluster.category_id} near (${cluster.centroid_lat.toFixed(4)}, ${cluster.centroid_lng.toFixed(4)}).`);
  }

  const lastOccurrence = new Date(sorted[sorted.length - 1].created_at);
  const predictedNext  = new Date(lastOccurrence.getTime() + medianInterval * 86400000);
  const trend          = detectTrend(intervals);

  const { score, breakdown } = computeRiskScore(
    cluster.events.length, medianInterval, trend, cluster.category_id
  );

  const confidence = wilsonScoreConfidence(
    predictionSuccesses, predictionAttempts, cluster.events.length
  );

  const severity        = deriveSeverity(score);
  const recommendation  = generateRecommendation(cluster.events.length, severity, trend);

  return {
    occurrence_count:       cluster.events.length,
    merged_event_count:     cluster.events.reduce((s, e) => s + e.merge_count, 0),
    avg_interval_days:      Math.round(avgInterval * 10) / 10,
    median_interval_days:   Math.round(medianInterval * 10) / 10,
    last_occurrence_at:     lastOccurrence,
    predicted_next_at:      predictedNext,
    prediction_confidence:  confidence,
    risk_score:             score,
    severity_level:         severity,
    trend,
    score_breakdown:        breakdown,
    recommendation_text:    recommendation,
    intervals_days:         intervals,
  };
}
