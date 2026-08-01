import { ANALYSIS_CONFIG } from './config';

export interface SeasonalResult {
  eligible:                     boolean;
  reason:                       string;
  seasonal_index:               number;   // for the predicted month
  adjusted_median_interval:     number;   // seasonally corrected interval
  seasonal_decomposition_applied: boolean;
}

/**
 * Applies additive seasonal decomposition to adjust the median interval.
 * Only eligible clusters (≥24 months history, ≥12 events) receive this.
 */
export function applySeasonalDecomposition(
  eventDates:      Date[],
  medianInterval:  number,
  predictedDate:   Date
): SeasonalResult {
  const monthsSpan = getMonthSpan(eventDates);

  if (monthsSpan < ANALYSIS_CONFIG.SEASONAL_MIN_MONTHS) {
    return {
      eligible: false,
      reason: `Only ${monthsSpan} months of history (need ≥${ANALYSIS_CONFIG.SEASONAL_MIN_MONTHS})`,
      seasonal_index: 0,
      adjusted_median_interval: medianInterval,
      seasonal_decomposition_applied: false,
    };
  }

  if (eventDates.length < ANALYSIS_CONFIG.SEASONAL_MIN_EVENTS) {
    return {
      eligible: false,
      reason: `Only ${eventDates.length} events (need ≥${ANALYSIS_CONFIG.SEASONAL_MIN_EVENTS})`,
      seasonal_index: 0,
      adjusted_median_interval: medianInterval,
      seasonal_decomposition_applied: false,
    };
  }

  // Build monthly complaint counts
  const monthlyCounts: Record<string, number> = {};
  for (const date of eventDates) {
    const key = `${date.getFullYear()}-${date.getMonth()}`; // 0-indexed month
    monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
  }

  // Compute 3-month centered moving average (trend T(t))
  const keys   = Object.keys(monthlyCounts).sort();
  const counts = keys.map(k => monthlyCounts[k]);
  const trend: number[] = counts.map((_, i) => {
    if (i === 0 || i === counts.length - 1) return counts[i];
    return (counts[i - 1] + counts[i] + counts[i + 1]) / 3;
  });

  // Seasonal indices: average deviation from trend per calendar month (0–11)
  const deviationsByMonth: Record<number, number[]> = {};
  keys.forEach((key, i) => {
    const month = parseInt(key.split('-')[1]);
    if (!deviationsByMonth[month]) deviationsByMonth[month] = [];
    deviationsByMonth[month].push(counts[i] - trend[i]);
  });

  const seasonalIndices: Record<number, number> = {};
  for (let m = 0; m < 12; m++) {
    const devs = deviationsByMonth[m] || [0];
    seasonalIndices[m] = devs.reduce((s, v) => s + v, 0) / devs.length;
  }

  // Normalize so indices sum to zero
  const indexMean = Object.values(seasonalIndices).reduce((s, v) => s + v, 0) / 12;
  for (let m = 0; m < 12; m++) {
    seasonalIndices[m] = (seasonalIndices[m] || 0) - indexMean;
  }

  const predictedMonth     = predictedDate.getMonth();
  const idx                = seasonalIndices[predictedMonth] || 0;
  const avgMonthlyCount    = counts.reduce((s, v) => s + v, 0) / counts.length;
  const normalizedIndex    = avgMonthlyCount > 0 ? idx / avgMonthlyCount : 0;
  const adjustedInterval   = medianInterval / Math.max(0.5, 1 + normalizedIndex);

  return {
    eligible: true,
    reason: 'Seasonal decomposition applied',
    seasonal_index: Math.round(normalizedIndex * 1000) / 1000,
    adjusted_median_interval: Math.max(1, Math.round(adjustedInterval * 10) / 10),
    seasonal_decomposition_applied: true,
  };
}

function getMonthSpan(dates: Date[]): number {
  if (dates.length < 2) return 0;
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const diffMs = sorted[sorted.length - 1].getTime() - sorted[0].getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
}
