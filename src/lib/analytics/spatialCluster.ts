import { haversineMetres } from './haversine';
import { ANALYSIS_CONFIG } from './config';
import type { DeduplicatedEvent } from './eventDeduplicator';

export interface IssueCluster {
  category_id: string;
  centroid_lat: number;
  centroid_lng: number;
  events: DeduplicatedEvent[];
  radius_metres: number;
}

/**
 * Groups deduplicated events into spatial clusters using greedy radius-based
 * assignment with category-specific radii. Clusters are deterministic and
 * reproducible — no randomness, no k-means iteration.
 */
export function clusterByCategory(
  events: DeduplicatedEvent[]
): IssueCluster[] {
  // Group by category first
  const byCategory: Record<string, DeduplicatedEvent[]> = {};
  for (const event of events) {
    const cat = event.category_id || 'default';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(event);
  }

  const clusters: IssueCluster[] = [];

  for (const [category_id, categoryEvents] of Object.entries(byCategory)) {
    const radius =
      ANALYSIS_CONFIG.CLUSTER_RADIUS_METRES[category_id.toLowerCase()] ??
      ANALYSIS_CONFIG.CLUSTER_RADIUS_METRES['default'];

    const assigned = new Set<string>();

    for (const seed of categoryEvents) {
      if (assigned.has(seed.id)) continue;

      const members: DeduplicatedEvent[] = [seed];
      assigned.add(seed.id);

      for (const candidate of categoryEvents) {
        if (assigned.has(candidate.id)) continue;
        const dist = haversineMetres(
          seed.latitude, seed.longitude,
          candidate.latitude, candidate.longitude
        );
        if (dist <= radius) {
          members.push(candidate);
          assigned.add(candidate.id);
        }
      }

      // Compute centroid
      const centroid_lat = members.reduce((s, e) => s + e.latitude, 0) / members.length;
      const centroid_lng = members.reduce((s, e) => s + e.longitude, 0) / members.length;

      clusters.push({ category_id, centroid_lat, centroid_lng, events: members, radius_metres: radius });
    }
  }

  return clusters;
}
