async function runTests() {
  const { haversineMetres } = await import('./src/lib/analytics/haversine.ts');
  const { deduplicateEvents } = await import('./src/lib/analytics/eventDeduplicator.ts');
  const { wilsonScoreConfidence } = await import('./src/lib/analytics/metricsEngine.ts');
  const { applySeasonalDecomposition } = await import('./src/lib/analytics/seasonalDecomposition.ts');

  console.log('=== Running Analytics Engine Unit Tests ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✕ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Haversine
  console.log('1. Haversine Distance Utility');
  assert(haversineMetres(22.3072, 73.1811, 22.3072, 73.1811) === 0, 'Returns 0 for identical coordinates');
  const dist1deg = haversineMetres(0, 0, 1, 0);
  assert(dist1deg > 110000 && dist1deg < 112000, 'Returns ~111km per 1 degree latitude');
  assert(haversineMetres(22.3072, 73.1811, 22.3080, 73.1811) < 100, 'Identifies point inside 100m radius');

  // 2. Deduplication
  console.log('\n2. Event Deduplicator (24h Window)');
  const base = { category_id: 'water-leakage', latitude: 22.3072, longitude: 73.1811, status: 'RESOLVED', closed_at: null };
  const t1 = new Date('2024-01-01T00:00:00Z');
  const t2 = new Date(t1.getTime() + 23 * 3600000 + 59 * 60000);
  const res1 = deduplicateEvents([
    { ...base, id: 'a', created_at: t1.toISOString() },
    { ...base, id: 'b', created_at: t2.toISOString() },
  ]);
  assert(res1.length === 1 && res1[0].merge_count === 2, 'Merges 2 complaints filed 23h59m apart');

  const t3 = new Date(t1.getTime() + 24 * 3600000 + 60000);
  const res2 = deduplicateEvents([
    { ...base, id: 'a', created_at: t1.toISOString() },
    { ...base, id: 'b', created_at: t3.toISOString() },
  ]);
  assert(res2.length === 2, 'Does NOT merge 2 complaints filed 24h01m apart');

  // 3. Wilson Score Confidence
  console.log('\n3. Wilson Score Confidence');
  assert(wilsonScoreConfidence(0, 0, 2) === 40, 'Caps n<3 at 40%');
  assert(wilsonScoreConfidence(0, 0, 3) === 52, 'Caps n=3 at 52%');
  assert(wilsonScoreConfidence(0, 0, 4) === 62, 'Caps n=4 at 62%');
  assert(wilsonScoreConfidence(0, 0, 5) === 78, 'Caps n=5 at 78%');
  assert(wilsonScoreConfidence(0, 0, 10) === 98, 'Caps n>=10 at 98%');

  // 4. Seasonal Decomposition
  console.log('\n4. Seasonal Decomposition Eligibility');
  const dates = [new Date('2024-01-01'), new Date('2024-06-01'), new Date('2024-12-01')];
  const sRes = applySeasonalDecomposition(dates, 30, new Date('2025-01-01'));
  assert(sRes.eligible === false && sRes.seasonal_decomposition_applied === false, 'Rejects clusters with <24 months history');

  console.log(`\n=== Test Results: ${passed} Passed, ${failed} Failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
