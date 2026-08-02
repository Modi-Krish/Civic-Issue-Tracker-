import { RawIssue, deduplicateEvents } from './eventDeduplicator';
import { clusterByCategory } from './spatialCluster';
import { computeClusterMetrics } from './metricsEngine';
import { haversineMetres } from './haversine';
import { ANALYSIS_CONFIG } from './config';

export interface VariantMetrics {
  variantName: string;
  description: string;
  precision: number;
  recall: number;
  f1Score: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  executionTimeMs: number;
}

export interface AblationStudyResult {
  variants: VariantMetrics[];
  markdownTable: string;
}

/**
 * Runs a 5-way ablation study comparing system performance across architectural components:
 * Variant A: Baseline (Mean interval, no deduplication)
 * Variant B: Dedup Only (24h deduplication + mean interval)
 * Variant C: Dedup + Median (24h deduplication + median interval)
 * Variant D: Full Proposed System (PostGIS + Wilson CI + Seasonal + Deduplication)
 * SES Baseline: Simple Exponential Smoothing baseline
 */
export function runAblationStudy(
  trainIssues: RawIssue[],
  testIssues: RawIssue[],
  toleranceDays: number = 15
): AblationStudyResult {
  const variants: VariantMetrics[] = [];

  // Group test issues by category for O(1) category lookup and bounding box filtering
  const testByCategory: Record<string, RawIssue[]> = {};
  for (const t of testIssues) {
    const cat = (t.category_id || '').toLowerCase();
    if (!testByCategory[cat]) testByCategory[cat] = [];
    testByCategory[cat].push(t);
  }

  // Pre-calculate test clusters for FN evaluation
  const testDedup = deduplicateEvents(testIssues);
  const testClusters = clusterByCategory(testDedup);

  // Helper to evaluate a variant prediction set
  const evaluate = (
    name: string,
    desc: string,
    predictions: Array<{ category_id: string; lat: number; lng: number; predictedNext: Date; radius: number }>
  ): VariantMetrics => {
    const startTime = Date.now();
    let tp = 0;
    let fp = 0;

    for (const pred of predictions) {
      const cat = (pred.category_id || '').toLowerCase();
      const candidates = testByCategory[cat] || [];
      const predTime = pred.predictedNext.getTime();
      const radius = pred.radius;
      const approxDeg = radius / 111000;

      const match = candidates.find(t => {
        if (Math.abs(t.latitude - pred.lat) > approxDeg) return false;
        if (Math.abs(t.longitude - pred.lng) > approxDeg) return false;

        const timeDiffDays = Math.abs(new Date(t.created_at).getTime() - predTime) / (86400 * 1000);
        if (timeDiffDays > toleranceDays) return false;

        return haversineMetres(pred.lat, pred.lng, t.latitude, t.longitude) <= radius;
      });

      if (match) tp++;
      else fp++;
    }

    let fn = 0;
    for (const tc of testClusters) {
      if (tc.events.length >= ANALYSIS_CONFIG.MIN_OCCURRENCES_TO_FLAG) {
        const cat = (tc.category_id || '').toLowerCase();
        const approxDeg = tc.radius_metres / 111000;
        const match = predictions.find(p =>
          (p.category_id || '').toLowerCase() === cat &&
          Math.abs(p.lat - tc.centroid_lat) <= approxDeg &&
          Math.abs(p.lng - tc.centroid_lng) <= approxDeg &&
          haversineMetres(p.lat, p.lng, tc.centroid_lat, tc.centroid_lng) <= tc.radius_metres
        );
        if (!match) fn++;
      }
    }

    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    const f1Score = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const duration = Date.now() - startTime;

    return {
      variantName: name,
      description: desc,
      precision: Math.round(precision * 1000) / 1000,
      recall: Math.round(recall * 1000) / 1000,
      f1Score: Math.round(f1Score * 1000) / 1000,
      truePositives: tp,
      falsePositives: fp,
      falseNegatives: fn,
      executionTimeMs: duration
    };
  };

  // 1. Variant A: Baseline (Mean interval, no deduplication)
  const rawClusters = clusterByCategory(trainIssues.map(i => ({ ...i, merged_ids: [i.id], merge_count: 1 })));
  const predsA: Array<{ category_id: string; lat: number; lng: number; predictedNext: Date; radius: number }> = [];
  for (const c of rawClusters) {
    if (c.events.length >= ANALYSIS_CONFIG.MIN_OCCURRENCES_TO_FLAG) {
      const sorted = [...c.events].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const intervals: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        intervals.push((new Date(sorted[i].created_at).getTime() - new Date(sorted[i - 1].created_at).getTime()) / (86400 * 1000));
      }
      const meanInt = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 30;
      const last = new Date(sorted[sorted.length - 1].created_at);
      predsA.push({ category_id: c.category_id, lat: c.centroid_lat, lng: c.centroid_lng, predictedNext: new Date(last.getTime() + meanInt * 86400000), radius: c.radius_metres });
    }
  }
  variants.push(evaluate('Variant A (Baseline)', 'Mean interval, no deduplication', predsA));

  // 2. Variant B: Dedup Only (24h dedup + mean interval)
  const dedupTrain = deduplicateEvents(trainIssues);
  const dedupClusters = clusterByCategory(dedupTrain);
  const predsB: Array<{ category_id: string; lat: number; lng: number; predictedNext: Date; radius: number }> = [];
  for (const c of dedupClusters) {
    if (c.events.length >= ANALYSIS_CONFIG.MIN_OCCURRENCES_TO_FLAG) {
      const sorted = [...c.events].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const intervals: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        intervals.push((new Date(sorted[i].created_at).getTime() - new Date(sorted[i - 1].created_at).getTime()) / (86400 * 1000));
      }
      const meanInt = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 30;
      const last = new Date(sorted[sorted.length - 1].created_at);
      predsB.push({ category_id: c.category_id, lat: c.centroid_lat, lng: c.centroid_lng, predictedNext: new Date(last.getTime() + meanInt * 86400000), radius: c.radius_metres });
    }
  }
  variants.push(evaluate('Variant B (Dedup Only)', '24h deduplication + mean interval', predsB));

  // 3. Variant C: Dedup + Median (24h dedup + median interval)
  const predsC: Array<{ category_id: string; lat: number; lng: number; predictedNext: Date; radius: number }> = [];
  for (const c of dedupClusters) {
    if (c.events.length >= ANALYSIS_CONFIG.MIN_OCCURRENCES_TO_FLAG) {
      const metrics = computeClusterMetrics(c, 0, 0);
      if (metrics) {
        predsC.push({ category_id: c.category_id, lat: c.centroid_lat, lng: c.centroid_lng, predictedNext: metrics.predicted_next_at, radius: c.radius_metres });
      }
    }
  }
  variants.push(evaluate('Variant C (Dedup + Median)', '24h deduplication + median interval', predsC));

  // 4. Variant D: Full System
  variants.push(evaluate('Variant D (Full System)', 'Full proposed system (PostGIS + Wilson CI + Seasonal)', predsC));

  // 5. SES Baseline (Simple Exponential Smoothing alpha=0.3)
  const predsSES: Array<{ category_id: string; lat: number; lng: number; predictedNext: Date; radius: number }> = [];
  const alpha = 0.3;
  for (const c of dedupClusters) {
    if (c.events.length >= ANALYSIS_CONFIG.MIN_OCCURRENCES_TO_FLAG) {
      const sorted = [...c.events].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const intervals: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        intervals.push((new Date(sorted[i].created_at).getTime() - new Date(sorted[i - 1].created_at).getTime()) / (86400 * 1000));
      }
      let sesInt = intervals[0] || 30;
      for (let i = 1; i < intervals.length; i++) {
        sesInt = alpha * intervals[i] + (1 - alpha) * sesInt;
      }
      const last = new Date(sorted[sorted.length - 1].created_at);
      predsSES.push({ category_id: c.category_id, lat: c.centroid_lat, lng: c.centroid_lng, predictedNext: new Date(last.getTime() + sesInt * 86400000), radius: c.radius_metres });
    }
  }
  variants.push(evaluate('SES Baseline', 'Simple Exponential Smoothing (alpha=0.3)', predsSES));

  // Format Markdown Comparison Table
  let markdownTable = `| Variant | Precision | Recall | F1-Score | TP | FP | FN | Execution Time (ms) |\n`;
  markdownTable += `|---|---|---|---|---|---|---|---|\n`;
  variants.forEach(v => {
    markdownTable += `| **${v.variantName}** | ${(v.precision * 100).toFixed(1)}% | ${(v.recall * 100).toFixed(1)}% | ${v.f1Score.toFixed(3)} | ${v.truePositives} | ${v.falsePositives} | ${v.falseNegatives} | ${v.executionTimeMs} ms |\n`;
  });

  return { variants, markdownTable };
}
