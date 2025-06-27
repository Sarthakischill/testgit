import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SessionData, sessionOptions } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  if (session.isLoggedIn) {
    return NextResponse.json({ isLoggedIn: true });
  }

  return NextResponse.json({ isLoggedIn: false });
} 