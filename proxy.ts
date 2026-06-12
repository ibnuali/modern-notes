import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth/constants';

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/notes')) {
    const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

    if (!hasSession) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/notes/:path*'],
};
