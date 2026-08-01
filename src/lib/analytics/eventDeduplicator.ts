import { haversineMetres } from './haversine';
import { ANALYSIS_CONFIG } from './config';

export interface RawIssue {
  id: string;
  category_id: string;
  latitude: number;
  longitude: number;
  created_at: string; // ISO string
  status: string;
  closed_at: string | null;
}

export interface DeduplicatedEvent extends RawIssue {
  merged_ids: string[];   // original issue IDs that were merged into this event
  merge_count: number;    // how many duplicates were merged (1 = no merge)
}

/**
 * Merges duplicate citizen complaints into single infrastructure events.
 * Two complaints are duplicates if they share the same category, are within
 * the category's cluster radius, and were filed within 24 hours of each other.
 * The earliest complaint's timestamp is retained.
 */
export function deduplicateEvents(issues: RawIssue[]): DeduplicatedEvent[] {
  // Sort chronologically
  const sorted = [...issues].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const events: DeduplicatedEvent[] = [];
  const merged = new Set<string>();

  for (const issue of sorted) {
    if (merged.has(issue.id)) continue;

    const catKey = issue.category_id ? issue.category_id.toLowerCase() : 'default';
    const radius =
      ANALYSIS_CONFIG.CLUSTER_RADIUS_METRES[catKey] ??
      ANALYSIS_CONFIG.CLUSTER_RADIUS_METRES['default'];

    const event: DeduplicatedEvent = {
      ...issue,
      merged_ids: [issue.id],
      merge_count: 1,
    };

    // Check subsequent complaints for duplicates
    for (const candidate of sorted) {
      if (candidate.id === issue.id) continue;
      if (merged.has(candidate.id)) continue;
      if ((candidate.category_id || '').toLowerCase() !== (issue.category_id || '').toLowerCase()) continue;

      const timeDiff = Math.abs(
        new Date(candidate.created_at).getTime() -
        new Date(issue.created_at).getTime()
      ) / 1000; // convert to seconds

      if (timeDiff > ANALYSIS_CONFIG.DEDUP_WINDOW_SECONDS) continue;

      const distance = haversineMetres(
        issue.latitude, issue.longitude,
        candidate.latitude, candidate.longitude
      );

      if (distance <= radius) {
        event.merged_ids.push(candidate.id);
        event.merge_count++;
        merged.add(candidate.id);
      }
    }

    merged.add(issue.id);
    events.push(event);
  }

  return events;
}
