import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from './lib/session';
import { cookies } from 'next/headers';

const publicPaths = ['/login', '/api'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow requests to public paths (/login, /api/*) to pass through without authentication.
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  // For all other paths, enforce authentication.
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  const { isLoggedIn } = session;

  // If the user is not logged in, redirect them to the login page.
  if (!isLoggedIn) {
    console.log(`Unauthorized access attempt to ${pathname}, redirecting to login.`);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If the user is logged in, allow them to access the requested page.
  return NextResponse.next();
}

// Apply middleware to all paths except for static assets.
// The logic inside the middleware function will handle public/private routes.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 