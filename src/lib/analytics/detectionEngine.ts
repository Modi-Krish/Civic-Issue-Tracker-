import { createClient } from '@supabase/supabase-js';
import { deduplicateEvents, type RawIssue } from './eventDeduplicator';
import { clusterByCategory } from './spatialCluster';
import { computeClusterMetrics } from './metricsEngine';
import { applySeasonalDecomposition } from './seasonalDecomposition';
import { ANALYSIS_CONFIG } from './config';

export interface DetectionSummary {
  patternsFound:    number;
  patternsUpdated:  number;
  alertsGenerated:  number;
  issuesAnalyzed:   number;
  mergedEvents:     number;
  durationMs:       number;
  errors:           string[];
}

export async function runDetectionEngine(): Promise<DetectionSummary> {
  const start    = Date.now();
  const errors:  string[] = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let patternsFound     = 0;
  let patternsCreated   = 0;
  let patternsUpdated   = 0;
  let alertsGenerated   = 0;
  let rawIssues: RawIssue[] = [];
  let mergedEventsCount = 0;

  try {
    // ── 1. Load historical issues from Firestore and Supabase ─────────────────
    const lookbackDate = new Date();
    lookbackDate.setMonth(lookbackDate.getMonth() - ANALYSIS_CONFIG.LOOKBACK_MONTHS);

    // Load from Firestore
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const { db: fDb } = await import('@/lib/firebase');
      const issuesSnap = await getDocs(collection(fDb, 'issues'));

      issuesSnap.docs.forEach(doc => {
        const d = doc.data();
        const createdAt = d.created_at?.toDate ? d.created_at.toDate() : new Date(d.created_at || Date.now());
        const lat = parseFloat(d.location_lat || d.latitude || d.lat || 0);
        const lng = parseFloat(d.location_lng || d.longitude || d.lng || 0);

        if (createdAt >= lookbackDate && lat !== 0 && lng !== 0) {
          rawIssues.push({
            id: doc.id,
            category_id: d.issue_type || d.category_id || 'water-leakage',
            latitude: lat,
            longitude: lng,
            created_at: createdAt.toISOString(),
            status: d.status || 'RESOLVED',
            closed_at: d.closed_at ? new Date(d.closed_at).toISOString() : null
          });
        }
      });
    } catch (fsErr) {
      console.warn('Firestore issues load notice:', fsErr);
    }

    // Load from Supabase if table exists
    try {
      const { data: sIssues } = await supabase
        .from('issues')
        .select('id, category_id, latitude, longitude, created_at, status, closed_at')
        .gte('created_at', lookbackDate.toISOString())
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (sIssues) {
        sIssues.forEach(s => {
          if (!rawIssues.some(r => r.id === s.id)) {
            rawIssues.push(s as RawIssue);
          }
        });
      }
    } catch {
      // Ignore Supabase missing table error
    }

    if (rawIssues.length === 0) {
      return { patternsFound: 0, patternsUpdated: 0, alertsGenerated: 0,
               issuesAnalyzed: 0, mergedEvents: 0, durationMs: Date.now() - start, errors };
    }

    // ── 2. Deduplicate ───────────────────────────────────────────────────────
    const deduplicated = deduplicateEvents(rawIssues);
    mergedEventsCount = rawIssues.length - deduplicated.length;

    // ── 3. Cluster by category and location ─────────────────────────────────
    const clusters = clusterByCategory(deduplicated);

    for (const cluster of clusters) {
      if (cluster.events.length < ANALYSIS_CONFIG.MIN_OCCURRENCES_TO_FLAG) continue;

      try {
        const prevSuccesses = 0;
        const prevAttempts  = 0;
        const prevSeverity  = 'LOW';

        // ── 5. Compute metrics ────────────────────────────────────────────
        const metrics = computeClusterMetrics(cluster, prevSuccesses, prevAttempts);
        if (!metrics) continue;

        // ── 6. Apply seasonal decomposition if eligible ───────────────────
        const eventDates  = cluster.events.map(e => new Date(e.created_at));
        const seasonal    = applySeasonalDecomposition(
          eventDates, metrics.median_interval_days, metrics.predicted_next_at
        );

        const finalPredicted = seasonal.seasonal_decomposition_applied
          ? new Date(metrics.last_occurrence_at.getTime() + seasonal.adjusted_median_interval * 86400000)
          : metrics.predicted_next_at;

        // ── 7. Upsert pattern payload ─────────────────────────────────────
        const patternPayload = {
          category_id:                    cluster.category_id,
          cluster_lat:                    cluster.centroid_lat,
          cluster_lng:                    cluster.centroid_lng,
          location_description:           `Cluster near (${cluster.centroid_lat.toFixed(4)}, ${cluster.centroid_lng.toFixed(4)})`,
          occurrence_count:               metrics.occurrence_count,
          merged_event_count:             metrics.merged_event_count,
          avg_interval_days:              metrics.avg_interval_days,
          median_interval_days:           metrics.median_interval_days,
          last_occurrence_at:             metrics.last_occurrence_at.toISOString(),
          predicted_next_at:              finalPredicted.toISOString(),
          prediction_confidence:          metrics.prediction_confidence,
          risk_score:                     metrics.risk_score,
          severity_level:                 metrics.severity_level,
          trend:                          metrics.trend,
          score_breakdown:                metrics.score_breakdown,
          seasonal_decomposition_applied: seasonal.seasonal_decomposition_applied,
          seasonal_index:                 seasonal.seasonal_index,
          recommendation_text:            metrics.recommendation_text,
          status:                         'ACTIVE',
          is_active:                      true,
          updated_at:                     new Date().toISOString(),
        };

        let patternId: string | null = null;

        // Sync to Firestore
        try {
          const { collection, getDocs, addDoc, updateDoc, doc, query, where } = await import('firebase/firestore');
          const { db: fDb } = await import('@/lib/firebase');

          const fsQ = query(
            collection(fDb, 'recurring_patterns'),
            where('category_id', '==', cluster.category_id),
            where('status', '==', 'ACTIVE')
          );
          const fsSnap = await getDocs(fsQ);

          let fsMatchDoc: any = null;
          fsSnap.docs.forEach(d => {
            const p = d.data();
            const latDiff = Math.abs((p.cluster_lat || 0) - cluster.centroid_lat);
            const lngDiff = Math.abs((p.cluster_lng || 0) - cluster.centroid_lng);
            if (latDiff <= 0.002 && lngDiff <= 0.002) fsMatchDoc = d;
          });

          if (fsMatchDoc) {
            patternId = fsMatchDoc.id;
            await updateDoc(doc(fDb, 'recurring_patterns', patternId!), patternPayload);
            patternsUpdated++;
          } else {
            const newFsDoc = await addDoc(collection(fDb, 'recurring_patterns'), {
              ...patternPayload,
              created_at: new Date().toISOString()
            });
            patternId = newFsDoc.id;
            patternsCreated++;

            const daysUntil = Math.round((finalPredicted.getTime() - Date.now()) / 86400000);
            const msg = generateAlertMessage(cluster.category_id, metrics.occurrence_count, metrics.severity_level, daysUntil, metrics.trend);

            await addDoc(collection(fDb, 'recurring_alerts'), {
              pattern_id: patternId,
              message: msg,
              priority: metrics.severity_level,
              alert_type: 'NEW_PATTERN',
              status: 'UNREAD',
              created_at: new Date().toISOString()
            });
            alertsGenerated++;
          }
        } catch (fsErr) {
          console.warn('Firestore pattern sync notice:', fsErr);
        }

        // Sync to Supabase if table exists
        try {
          const { data: upserted } = await supabase
            .from('recurring_patterns')
            .upsert(patternPayload, { onConflict: 'category_id,cluster_lat,cluster_lng' })
            .select('id')
            .single();

          if (upserted?.id) {
            const issueLinks = cluster.events.flatMap(e =>
              e.merged_ids.map(issueId => ({ pattern_id: upserted.id, issue_id: issueId }))
            );
            await supabase.from('pattern_issue_map').upsert(issueLinks, { onConflict: 'pattern_id,issue_id' });
          }
        } catch {
          // Supabase table missing fallback
        }

        patternsFound++;

      } catch (clusterError: any) {
        errors.push(`Cluster error: ${clusterError.message}`);
      }
    }

    // Update metadata
    try {
      await supabase.from('analytics_metadata').upsert({
        id:                     '00000000-0000-0000-0000-000000000001',
        last_analyzed_at:       new Date().toISOString(),
        last_successful_run_at: new Date().toISOString(),
        last_run_status:        'success',
        last_run_error:         null,
        patterns_found:         patternsFound,
        alerts_generated:       alertsGenerated,
      });
    } catch {
      // Ignore
    }

  } catch (fatalError: any) {
    errors.push(`Fatal: ${fatalError.message}`);
  }

  return {
    patternsFound,
    patternsUpdated,
    alertsGenerated,
    issuesAnalyzed: rawIssues.length,
    mergedEvents: mergedEventsCount,
    durationMs: Date.now() - start,
    errors,
  };
}

function generateAlertMessage(
  category: string, count: number, severity: string, daysUntil: number, trend: string
): string {
  const urgent   = daysUntil <= 7  ? 'URGENT: '  : '';
  const upcoming = daysUntil > 0   ? `Next occurrence predicted in ${daysUntil} days.`
                                   : `Next occurrence is overdue.`;
  const trendNote = trend === 'INCREASING' ? ' Failure frequency is accelerating.' : '';
  return `${urgent}${severity} recurring ${category} pattern detected (${count} occurrences). ${upcoming}${trendNote}`;
}
