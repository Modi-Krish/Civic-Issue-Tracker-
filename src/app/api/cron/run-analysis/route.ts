import { NextResponse } from 'next/server';
import { runDetectionEngine } from '@/lib/analytics/detectionEngine';

export async function GET(request: Request) {
  // Vercel Cron secret validation
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const summary = await runDetectionEngine();
  return NextResponse.json(summary);
}
