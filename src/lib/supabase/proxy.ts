import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // Database-free mock session handler: allow all pages to load
  return NextResponse.next();
}
