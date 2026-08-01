import { DeduplicatedEvent } from './eventDeduplicator';
import { haversineMetres } from './haversine';
import { ANALYSIS_CONFIG } from './config';

export interface ClusterGroup {
  category_id: string;
  department_id?: string;
  centroid_lat: number;
  centroid_lng: number;
  location_description: string;
  events: DeduplicatedEvent[];
  total_complaints: number;
}

export function clusterEventsSpatially(mergedEvents: DeduplicatedEvent[]): ClusterGroup[] {
  if (mergedEvents.length === 0) return [];

  const eventsByCategory: Record<string, DeduplicatedEvent[]> = {};
  for (const event of mergedEvents) {
    const catKey = event.category_id || 'default';
    if (!eventsByCategory[catKey]) eventsByCategory[catKey] = [];
    eventsByCategory[catKey].push(event);
  }

  const allClusters: ClusterGroup[] = [];

  for (const [catKey, events] of Object.entries(eventsByCategory)) {
    const radiusMeters = ANALYSIS_CONFIG.CLUSTER_RADIUS_METRES[catKey.toLowerCase()] || ANALYSIS_CONFIG.CLUSTER_RADIUS_METRES['default'];
    const visited = new Set<string>();

    for (let i = 0; i < events.length; i++) {
      const e1 = events[i];
      if (visited.has(e1.id)) continue;

      const currentClusterEvents: DeduplicatedEvent[] = [e1];
      visited.add(e1.id);

      for (let j = i + 1; j < events.length; j++) {
        const e2 = events[j];
        if (visited.has(e2.id)) continue;

        const dist = haversineMetres(e1.latitude, e1.longitude, e2.latitude, e2.longitude);
        if (dist <= radiusMeters) {
          currentClusterEvents.push(e2);
          visited.add(e2.id);
        }
      }

      const totalComplaints = currentClusterEvents.reduce((acc, ev) => acc + (ev.merge_count || 1), 0);
      if (currentClusterEvents.length >= ANALYSIS_CONFIG.MIN_OCCURRENCES_TO_FLAG || totalComplaints >= ANALYSIS_CONFIG.MIN_OCCURRENCES_TO_FLAG) {
        const avgLat = currentClusterEvents.reduce((acc, ev) => acc + ev.latitude, 0) / currentClusterEvents.length;
        const avgLng = currentClusterEvents.reduce((acc, ev) => acc + ev.longitude, 0) / currentClusterEvents.length;

        allClusters.push({
          category_id: catKey,
          centroid_lat: avgLat,
          centroid_lng: avgLng,
          location_description: `Cluster near (${avgLat.toFixed(4)}, ${avgLng.toFixed(4)})`,
          events: currentClusterEvents.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
          total_complaints: totalComplaints
        });
      }
    }
  }

  return allClusters;
}
