import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Routes that never require authentication
const PUBLIC_PATHS = [
  "/login",
  "/setup",
  "/api/auth/login",
  "/api/auth/setup",
  "/api/auth/check",
  "/api/auth/logout",
];

// Marketing / public pages (no auth required)
const MARKETING_PATHS = [
  "/features",
  "/pricing",
  "/docs",
  "/security",
  "/license",
  "/privacy",
  "/terms",
  "/billing/success",
  "/api/billing",
];

const COOKIE_NAME = "aistudio_session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public auth paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow marketing pages
  if (MARKETING_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Allow health endpoints
  if (pathname.startsWith("/api/health")) {
    return NextResponse.next();
  }

  // Root "/" — special handling: show landing if not authenticated, redirect to /workflows if authenticated
  if (pathname === "/") {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (token) {
      try {
        const masterKeyHex = process.env.MASTER_KEY;
        if (!masterKeyHex) {
          // Dev mode: trust the token exists
          return NextResponse.redirect(new URL("/workflows", request.url));
        }
        const key = new Uint8Array(Buffer.from(masterKeyHex, "hex"));
        await jwtVerify(token, key, { issuer: "aistudio" });
        return NextResponse.redirect(new URL("/workflows", request.url));
      } catch {
        // Invalid token — show landing page
        return NextResponse.next();
      }
    }
    // No token — show landing page
    return NextResponse.next();
  }

  // All other routes require authentication
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 },
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify JWT
  try {
    const masterKeyHex = process.env.MASTER_KEY;
    if (!masterKeyHex) {
      return NextResponse.next();
    }
    const key = new Uint8Array(Buffer.from(masterKeyHex, "hex"));
    await jwtVerify(token, key, { issuer: "aistudio" });
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Invalid session" },
        { status: 401 },
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|og-image.png|robots.txt|sitemap.xml).*)"],
};
