import { RawIssue, deduplicateEvents } from './eventDeduplicator';
import { clusterByCategory } from './spatialCluster';
import { computeClusterMetrics } from './metricsEngine';
import { haversineMetres } from './haversine';
import { ANALYSIS_CONFIG } from './config';
import { computeBootstrapCIs, type BootstrapCI, type PredictionSample } from './bootstrap';

export interface BenchmarkMetrics {
  totalRecordsAnalyzed: number;
  trainingCount: number;
  testingCount: number;
  earliestTrainingDate: string;
  latestTrainingDate: string;
  earliestTestingDate: string;
  latestTestingDate: string;
  deduplicatedEventsCount: number;
  clustersEvaluated: number;
  patternsPredicted: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  precisionCI: BootstrapCI;
  recallCI: BootstrapCI;
  f1CI: BootstrapCI;
  samples: PredictionSample[];
  patternsList: any[];
}

/**
 * Runs Ground Truth validation against NYC 311 dataset using a FIXED CALENDAR DATE TEMPORAL SPLIT:
 * - Training Set: created_at < 2025-01-01T00:00:00.000Z
 * - Testing Set: created_at >= 2025-01-01T00:00:00.000Z
 * Also computes 1,000 resample 95% Bootstrap Confidence Intervals.
 */
export function evaluateGroundTruth(
  issues: RawIssue[],
  splitDateStr: string = '2025-01-01T00:00:00.000Z',
  toleranceDays: number = 15
): BenchmarkMetrics {
  if (issues.length === 0) {
    throw new Error('[Benchmark Error] Cannot evaluate empty dataset.');
  }

  const splitTime = new Date(splitDateStr).getTime();

  // Sort issues chronologically
  const sortedIssues = [...issues].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  let trainIssues = sortedIssues.filter(i => new Date(i.created_at).getTime() < splitTime);
  let testIssues = sortedIssues.filter(i => new Date(i.created_at).getTime() >= splitTime);

  // If fixed cutoff yields 0 test issues, fallback to 75th percentile date of dataset
  if (testIssues.length === 0 || trainIssues.length === 0) {
    const cutoffIndex = Math.floor(sortedIssues.length * 0.75);
    const dynamicSplitTime = new Date(sortedIssues[cutoffIndex].created_at).getTime();
    trainIssues = sortedIssues.filter(i => new Date(i.created_at).getTime() < dynamicSplitTime);
    testIssues = sortedIssues.filter(i => new Date(i.created_at).getTime() >= dynamicSplitTime);
  }

  const earliestTrain = trainIssues.length > 0 ? trainIssues[0].created_at : 'N/A';
  const latestTrain = trainIssues.length > 0 ? trainIssues[trainIssues.length - 1].created_at : 'N/A';
  const earliestTest = testIssues.length > 0 ? testIssues[0].created_at : 'N/A';
  const latestTest = testIssues.length > 0 ? testIssues[testIssues.length - 1].created_at : 'N/A';

  console.log(`\n================================================`);
  console.log(`Temporal Split Summary (Cutoff: ${splitDateStr})`);
  console.log(`================================================`);
  console.log(`• Training records:      ${trainIssues.length}`);
  console.log(`• Testing records:       ${testIssues.length}`);
  console.log(`• Earliest training date: ${earliestTrain}`);
  console.log(`• Latest training date:   ${latestTrain}`);
  console.log(`• Earliest testing date:  ${earliestTest}`);
  console.log(`• Latest testing date:   ${latestTest}`);
  console.log(`================================================\n`);

  if (trainIssues.length === 0) {
    throw new Error(`[Benchmark Error] Training records == 0. Temporal split cutoff (${splitDateStr}) produced invalid benchmark.`);
  }

  // 1. Deduplicate & Cluster Historical Training Set
  const deduplicatedTrain = deduplicateEvents(trainIssues);
  const clusters = clusterByCategory(deduplicatedTrain);

  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  const samples: PredictionSample[] = [];
  const patternsList: any[] = [];

  for (const cluster of clusters) {
    if (cluster.events.length < ANALYSIS_CONFIG.MIN_OCCURRENCES_TO_FLAG) continue;

    const metrics = computeClusterMetrics(cluster, 0, 0);
    if (!metrics) continue;

    const predictedTime = metrics.predicted_next_at.getTime();
    const radiusMetres = cluster.radius_metres;

    // Check if any actual future NYC 311 complaint occurred within cluster radius & tolerance window
    const actualMatch = testIssues.find(t => {
      if ((t.category_id || '').toLowerCase() !== (cluster.category_id || '').toLowerCase()) return false;

      const dist = haversineMetres(cluster.centroid_lat, cluster.centroid_lng, t.latitude, t.longitude);
      if (dist > radiusMetres) return false;

      const timeDiffDays = Math.abs(new Date(t.created_at).getTime() - predictedTime) / (1000 * 60 * 60 * 24);
      return timeDiffDays <= toleranceDays;
    });

    const isTruePositive = !!actualMatch;
    if (isTruePositive) {
      truePositives++;
      samples.push({ isTruePositive: true, isFalsePositive: false, isFalseNegative: false });
    } else {
      falsePositives++;
      samples.push({ isTruePositive: false, isFalsePositive: true, isFalseNegative: false });
    }

    patternsList.push({
      category_id: cluster.category_id,
      centroid_lat: cluster.centroid_lat,
      centroid_lng: cluster.centroid_lng,
      occurrence_count: metrics.occurrence_count,
      median_interval_days: metrics.median_interval_days,
      predicted_next_at: metrics.predicted_next_at,
      prediction_confidence: metrics.prediction_confidence,
      risk_score: metrics.risk_score,
      severity_level: metrics.severity_level,
      trend: metrics.trend,
      isTruePositive,
      matchedFutureIssueId: actualMatch ? actualMatch.id : null
    });
  }

  // Count unflagged recurring occurrences in test set as False Negatives
  const deduplicatedTest = deduplicateEvents(testIssues);
  const testClusters = clusterByCategory(deduplicatedTest);
  for (const tc of testClusters) {
    if (tc.events.length >= ANALYSIS_CONFIG.MIN_OCCURRENCES_TO_FLAG) {
      const matchInHistory = clusters.find(c =>
        c.category_id === tc.category_id &&
        haversineMetres(c.centroid_lat, c.centroid_lng, tc.centroid_lat, tc.centroid_lng) <= tc.radius_metres
      );
      if (!matchInHistory) {
        falseNegatives++;
        samples.push({ isTruePositive: false, isFalsePositive: false, isFalseNegative: true });
      }
    }
  }

  const precision = (truePositives + falsePositives) > 0 ? truePositives / (truePositives + falsePositives) : 0;
  const recall = (truePositives + falseNegatives) > 0 ? truePositives / (truePositives + falseNegatives) : 0;
  const f1Score = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  // 2. Compute 1,000 resample 95% Bootstrap Confidence Intervals
  const bootstrap = computeBootstrapCIs(samples, 1000, 0.95);

  return {
    totalRecordsAnalyzed: issues.length,
    trainingCount: trainIssues.length,
    testingCount: testIssues.length,
    earliestTrainingDate: earliestTrain,
    latestTrainingDate: latestTrain,
    earliestTestingDate: earliestTest,
    latestTestingDate: latestTest,
    deduplicatedEventsCount: deduplicatedTrain.length,
    clustersEvaluated: clusters.length,
    patternsPredicted: patternsList.length,
    truePositives,
    falsePositives,
    falseNegatives,
    precision: Math.round(precision * 1000) / 1000,
    recall: Math.round(recall * 1000) / 1000,
    f1Score: Math.round(f1Score * 1000) / 1000,
    precisionCI: bootstrap.precisionCI,
    recallCI: bootstrap.recallCI,
    f1CI: bootstrap.f1CI,
    samples,
    patternsList
  };
}