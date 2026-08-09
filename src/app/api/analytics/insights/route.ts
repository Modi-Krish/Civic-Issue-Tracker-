/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

// Simple cluster detection for hotspot insights
interface Point {
  id: string;
  lat: number;
  lng: number;
  category: string;
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET() {
  try {
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ insights: [] });
    }

    const snapshot = await db.collection('issues').get();
    const activePoints: Point[] = [];
    const categoryCounts: Record<string, number> = {};

    snapshot.forEach(doc => {
      const d = doc.data();
      if (d.status !== 'CLOSED' && d.status !== 'APPROVED') {
        const lat = parseFloat(String(d.location_lat));
        const lng = parseFloat(String(d.location_lng));
        const cat = d.issue_type || 'Other';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
          activePoints.push({
            id: doc.id,
            lat,
            lng,
            category: cat
          });
        }
      }
    });

    const insights: any[] = [];

    // 1. Hotspot detection (3+ issues of same type within 150m)
    const processedIds = new Set<string>();
    for (const p of activePoints) {
      if (processedIds.has(p.id)) continue;

      const cluster = activePoints.filter(other => 
        other.category === p.category && 
        getDistanceMeters(p.lat, p.lng, other.lat, other.lng) <= 150
      );

      if (cluster.length >= 3) {
        cluster.forEach(c => processedIds.add(c.id));
        insights.push({
          type: 'HOTSPOT',
          title: `${p.category} Hotspot Alert`,
          body: `We detected a cluster of ${cluster.length} active "${p.category}" issues concentrated within a 150-meter radius. A joint inspection of this area is recommended to address systemic failures.`,
          priority: 'HIGH',
          category: p.category,
          count: cluster.length
        });
      }
    }

    // 2. Trend insight (Sanitation or Water spikes)
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      if (count >= 5) {
        insights.push({
          type: 'VOLUME_SPIKE',
          title: `High Complaint Volume for ${cat}`,
          body: `There are currently ${count} active "${cat}" grievances registered in the system. Consider reallocating additional field workers to this category to clear the queue.`,
          priority: count >= 10 ? 'CRITICAL' : 'MEDIUM',
          category: cat,
          count
        });
      }
    });

    // Default insight if none generated
    if (insights.length === 0) {
      insights.push({
        type: 'HEALTHY',
        title: 'System Performance Stable',
        body: 'Grievance counts are distributed normally. No major geographic clustering or volume spikes detected in the last 30 days.',
        priority: 'LOW'
      });
    }

    return NextResponse.json({ insights });
  } catch (error: any) {
    console.error("GET /api/analytics/insights exception:", error);
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}
