import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, allow all pages to load
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  // Extract access token from cookies and verify the session
  const accessToken = request.cookies.get('sb-access-token')?.value
    || request.cookies.get(`sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`)?.value;

  if (!accessToken) {
    return NextResponse.next();
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user } } = await supabase.auth.getUser(accessToken);
    
    if (!user) {
      // Session invalid – clear and continue
      return NextResponse.next();
    }
  } catch {
    // Auth check failed – allow request to proceed
  }

  return NextResponse.next();
}
