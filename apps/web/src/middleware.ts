import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/setup", "/api/auth/"];
const COOKIE_NAME = "aistudio_session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow health endpoints (temporary, for scaffolding verification)
  if (pathname.startsWith("/api/health")) {
    return NextResponse.next();
  }

  // Check for session cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    // API routes return 401, pages redirect to login
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify JWT
  try {
    const masterKeyHex = process.env.MASTER_KEY;
    if (!masterKeyHex) {
      // In development without MASTER_KEY env, allow through (key is on disk)
      // Full verification happens in the API routes via lib/auth
      return NextResponse.next();
    }
    const key = new Uint8Array(Buffer.from(masterKeyHex, "hex"));
    await jwtVerify(token, key, { issuer: "aistudio" });
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "UNAUTHORIZED", message: "Invalid session" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
