export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPasswordHash, createSessionToken, setSessionCookie } from "@/lib/auth";

// Simple in-memory rate limiter
const attempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 5) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Too many login attempts. Try again in a minute." },
      { status: 429 },
    );
  }

  const body = await request.json();
  const { password } = body;

  if (!password || typeof password !== "string") {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Password is required" },
      { status: 400 },
    );
  }

  const hash = getPasswordHash();
  if (!hash) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Password not set. Complete setup first." },
      { status: 404 },
    );
  }

  const valid = await bcrypt.compare(password, hash);
  if (!valid) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Invalid password" },
      { status: 401 },
    );
  }

  const token = await createSessionToken();
  await setSessionCookie(token);

  return NextResponse.json({ ok: true });
}
