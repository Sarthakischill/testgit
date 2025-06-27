import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse, NextRequest } from 'next/server';
import { compare } from 'bcrypt';
import { supabase } from '@/lib/supabase';
import { SessionData, sessionOptions } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET() {
  return new Response('Method Not Allowed', { status: 405 });
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
    }

    const { data: loginData, error: dbError } = await supabase
      .from('gh_login')
      .select('hashed_password')
      .eq('name', 'site_password')
      .single();

    if (dbError || !loginData) {
      console.error('DB Error or no password configured:', dbError?.message);
      return NextResponse.json({ error: 'Site login is not configured correctly. Please contact an administrator.' }, { status: 500 });
    }
    
    const isMatch = await compare(password, loginData.hashed_password);

    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
    }

    const session = await getIronSession<SessionData>(cookies(), sessionOptions);
    session.isLoggedIn = true;
    await session.save();
    
    console.log('User successfully logged in.');
    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error('Login API Error:', error.message);
    return NextResponse.json({ error: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
} 