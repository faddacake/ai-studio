import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { isSetupComplete, setPasswordHash } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (isSetupComplete()) {
    return NextResponse.json({ error: "CONFLICT", message: "Password already set" }, { status: 409 });
  }

  const body = await request.json();
  const { password } = body;

  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const hash = await bcrypt.hash(password, 12);
  setPasswordHash(hash);

  return NextResponse.json({ ok: true });
}
