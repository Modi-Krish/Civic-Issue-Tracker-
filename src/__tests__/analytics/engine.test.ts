import { haversineMetres } from '../../lib/analytics/haversine';
import { deduplicateEvents } from '../../lib/analytics/eventDeduplicator';
import { wilsonScoreConfidence } from '../../lib/analytics/metricsEngine';
import { applySeasonalDecomposition } from '../../lib/analytics/seasonalDecomposition';

// Minimal test harness types for Jest/TypeScript environment
declare global {
  function describe(name: string, fn: () => void): void;
  function test(name: string, fn: () => void): void;
  function expect(actual: any): {
    toBe(expected: any): void;
    toBeGreaterThan(expected: number): void;
    toBeLessThan(expected: number): void;
    toBeLessThanOrEqual(expected: number): void;
    toHaveLength(expected: number): void;
  };
}

describe('Analytics Engine Unit Tests', () => {

  // ── Haversine Unit Tests ──────────────────────────────────────────────────
  describe('haversineMetres', () => {
    test('returns 0 for identical coordinates', () => {
      expect(haversineMetres(22.3072, 73.1811, 22.3072, 73.1811)).toBe(0);
    });

    test('returns correct distance for known pair (~111km per degree latitude)', () => {
      const d = haversineMetres(0, 0, 1, 0);
      expect(d).toBeGreaterThan(110000);
      expect(d).toBeLessThan(112000);
    });

    test('correctly identifies point inside 100m radius', () => {
      // ~0.0008 degrees ≈ 88.9m
      expect(haversineMetres(22.3072, 73.1811, 22.3080, 73.1811)).toBeLessThan(100);
    });
  });

  // ── Deduplication Unit Tests ──────────────────────────────────────────────
  describe('deduplicateEvents', () => {
    const base = { category_id: 'water-leakage', latitude: 22.3072, longitude: 73.1811, status: 'RESOLVED', closed_at: null };

    test('merges two complaints filed 23h59m apart (within window)', () => {
      const t1 = new Date('2024-01-01T00:00:00Z');
      const t2 = new Date(t1.getTime() + 23 * 3600000 + 59 * 60000);
      const result = deduplicateEvents([
        { ...base, id: 'a', created_at: t1.toISOString() },
        { ...base, id: 'b', created_at: t2.toISOString() },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].merge_count).toBe(2);
    });

    test('does NOT merge two complaints filed 24h01m apart', () => {
      const t1 = new Date('2024-01-01T00:00:00Z');
      const t2 = new Date(t1.getTime() + 24 * 3600000 + 60000);
      const result = deduplicateEvents([
        { ...base, id: 'a', created_at: t1.toISOString() },
        { ...base, id: 'b', created_at: t2.toISOString() },
      ]);
      expect(result).toHaveLength(2);
      expect(result[0].merge_count).toBe(1);
      expect(result[1].merge_count).toBe(1);
    });
  });

  // ── Wilson Score Confidence Tests ─────────────────────────────────────────
  describe('wilsonScoreConfidence', () => {
    test('enforces conservative caps during cold start', () => {
      expect(wilsonScoreConfidence(0, 0, 2)).toBe(40);
      expect(wilsonScoreConfidence(0, 0, 3)).toBe(52);
      expect(wilsonScoreConfidence(0, 0, 4)).toBe(62);
      expect(wilsonScoreConfidence(0, 0, 5)).toBe(78);
      expect(wilsonScoreConfidence(0, 0, 10)).toBe(98);
    });

    test('computes lower bound confidence when prediction history exists', () => {
      const conf = wilsonScoreConfidence(8, 10, 5);
      expect(conf).toBeGreaterThan(45);
      expect(conf).toBeLessThanOrEqual(98);
    });
  });

  // ── Seasonal Decomposition Tests ──────────────────────────────────────────
  describe('applySeasonalDecomposition', () => {
    test('rejects clusters with less than 24 months history', () => {
      const dates = [
        new Date('2024-01-01'),
        new Date('2024-06-01'),
        new Date('2024-12-01')
      ];
      const res = applySeasonalDecomposition(dates, 30, new Date('2025-01-01'));
      expect(res.eligible).toBe(false);
      expect(res.seasonal_decomposition_applied).toBe(false);
    });
  });

});
