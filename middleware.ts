import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from './lib/session';
import { cookies } from 'next/headers';

export async function middleware(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  const { isLoggedIn } = session;

  const { pathname } = request.nextUrl;

  // If the user is trying to access the login page itself, let them through
  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }
  
  // If the user is not logged in, redirect them to the login page
  if (!isLoggedIn) {
    console.log(`Unauthorized access attempt to ${pathname}, redirecting to login.`);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If the user is logged in, allow them to access the requested page
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  // The matcher defines which routes the middleware will run on.
  // We want to protect all routes except for API routes, static files, and image assets.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 