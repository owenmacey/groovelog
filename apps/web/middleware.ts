import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Better Auth uses __Secure- prefix when baseURL is https (production)
const SESSION_COOKIE = "better-auth.session_token";
const SESSION_COOKIE_SECURE = "__Secure-better-auth.session_token";

const AUTH_ROUTES = new Set(["/login", "/register"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoggedIn =
    request.cookies.has(SESSION_COOKIE) ||
    request.cookies.has(SESSION_COOKIE_SECURE);
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
    "/following",
    "/search",
    "/login",
    "/register",
  ],
};
