import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "better-auth.session_token";

const AUTH_ROUTES = new Set(["/login", "/register"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoggedIn = request.cookies.has(SESSION_COOKIE);
  const isAuthRoute = AUTH_ROUTES.has(pathname);

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/feed", request.url));
  }

  if (!isAuthRoute && !isLoggedIn) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    "/feed/:path*",
    "/album/:path*",
    "/track/:path*",
    "/user/:path*",
    "/search",
    "/login",
    "/register",
  ],
};
