export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPasswordHash, setPasswordHash } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || typeof currentPassword !== "string") {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Current password is required." },
      { status: 400 },
    );
  }

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "New password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const hash = getPasswordHash();
  if (!hash) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "No password set. Complete setup first." },
      { status: 404 },
    );
  }

  const valid = await bcrypt.compare(currentPassword, hash);
  if (!valid) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Current password is incorrect." },
      { status: 401 },
    );
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  setPasswordHash(newHash);

  return NextResponse.json({ ok: true });
}
