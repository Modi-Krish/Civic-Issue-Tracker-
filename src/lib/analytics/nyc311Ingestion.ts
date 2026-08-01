import { RawIssue } from './eventDeduplicator';

export interface NYC311Record {
  unique_key: string;
  created_date: string;
  closed_date?: string;
  complaint_type: string;
  descriptor?: string;
  incident_address?: string;
  street_name?: string;
  city?: string;
  borough?: string;
  latitude?: string;
  longitude?: string;
  status: string;
}

export interface IngestionOptions {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  targetLimit?: number;
  batchSize?: number;
  maxRetries?: number;
}

/**
 * Fetches real historical NYC 311 Open Data records from Socrata API (data.cityofnewyork.us)
 * using automatic pagination ($offset and $limit), ascending chronological order (created_date ASC),
 * and exponential backoff retry logic.
 */
export async function fetchNYC311Data(options: IngestionOptions = {}): Promise<RawIssue[]> {
  const startDate = options.startDate || '2022-01-01T00:00:00.000';
  const endDate = options.endDate || '2026-01-01T00:00:00.000';
  const targetLimit = options.targetLimit || 5000;
  const batchSize = options.batchSize || 1000;
  const maxRetries = options.maxRetries || 3;

  console.log(`[NYC 311 Pipeline] Initializing historical ingestion from ${startDate} to ${endDate} (Target: ${targetLimit} records)...`);

  const categoryFilter = `'Water System','Sewer','Street Condition','Pothole','Blocked Drain','Water Leak'`;
  const baseUrl = `https://data.cityofnewyork.us/resource/erm2-nwe9.json`;

  const seenKeys = new Set<string>();
  const mappedIssues: RawIssue[] = [];
  let offset = 0;
  let hasMore = true;

  while (mappedIssues.length < targetLimit && hasMore) {
    const currentLimit = Math.min(batchSize, targetLimit - mappedIssues.length);
    const whereClause = `created_date >= '${startDate}' AND created_date <= '${endDate}' AND latitude IS NOT NULL AND longitude IS NOT NULL AND complaint_type IN(${categoryFilter})`;
    const url = `${baseUrl}?$where=${encodeURIComponent(whereClause)}&$order=created_date ASC&$limit=${currentLimit}&$offset=${offset}`;

    let records: NYC311Record[] | null = null;
    let attempt = 0;

    while (attempt < maxRetries && !records) {
      try {
        attempt++;
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'CivicIssueTracker-ResearchEngine/1.0'
          }
        });

        if (response.status === 429) {
          console.warn(`[NYC 311 Pipeline] Socrata rate limit encountered (429). Retrying in ${attempt * 1500}ms...`);
          await new Promise(r => setTimeout(r, attempt * 1500));
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        records = await response.json();
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[NYC 311 Pipeline] Batch fetch attempt ${attempt}/${maxRetries} failed: ${errorMsg}`);
        if (attempt >= maxRetries) {
          console.error(`[NYC 311 Pipeline] Max retries reached for offset ${offset}. Terminating batch fetching.`);
          hasMore = false;
          break;
        }
        await new Promise(r => setTimeout(r, attempt * 1000));
      }
    }

    if (!records || records.length === 0) {
      hasMore = false;
      break;
    }

    let batchAdded = 0;
    for (const r of records) {
      if (!r.unique_key || seenKeys.has(r.unique_key)) continue;
      if (!r.latitude || !r.longitude || !r.created_date) continue;

      const lat = parseFloat(r.latitude);
      const lng = parseFloat(r.longitude);
      const createdDate = new Date(r.created_date);

      if (isNaN(lat) || isNaN(lng) || isNaN(createdDate.getTime())) continue;
      if (lat === 0 || lng === 0) continue;

      seenKeys.add(r.unique_key);

      // Map complaint type to normalized category
      let categoryId = 'default';
      const cType = (r.complaint_type || '').toLowerCase();
      if (cType.includes('water')) categoryId = 'water-leakage';
      else if (cType.includes('sewer') || cType.includes('drain')) categoryId = 'drainage';
      else if (cType.includes('street') || cType.includes('pothole')) categoryId = 'roads';

      mappedIssues.push({
        id: `nyc311_${r.unique_key}`,
        category_id: categoryId,
        latitude: lat,
        longitude: lng,
        created_at: createdDate.toISOString(),
        status: r.status === 'Closed' ? 'RESOLVED' : 'IN_PROGRESS',
        closed_at: r.closed_date && !isNaN(new Date(r.closed_date).getTime()) ? new Date(r.closed_date).toISOString() : null
      });

      batchAdded++;
    }

    offset += records.length;
    console.log(`Downloaded ${mappedIssues.length} records...`);

    if (records.length < currentLimit) {
      hasMore = false;
    }

    // Gentle delay between API requests to respect Socrata rate limits
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`Finished downloading ${mappedIssues.length} records.`);
  return mappedIssues;
}
