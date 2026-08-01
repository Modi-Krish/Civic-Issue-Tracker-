import { NextResponse } from 'next/server';
import { runDetectionEngine } from '@/lib/analytics/detectionEngine';
import { checkSystemHealth } from '@/lib/analytics/healthChecker';

export async function POST() {
  const health = await checkSystemHealth();
  const summary = await runDetectionEngine();
  return NextResponse.json({ ...summary, health });
}
