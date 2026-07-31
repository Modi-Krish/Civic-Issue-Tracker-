import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, full_name, role, department_id } = await req.json();

    if (!email || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      user: { 
        id: 'mock_' + Math.random().toString(36).substr(2, 9), 
        email, 
        user_metadata: {
          full_name,
          role,
          department_id: department_id || null,
        } 
      } 
    }, { status: 200 });

  } catch (err: any) {
    console.error('Error creating user:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
