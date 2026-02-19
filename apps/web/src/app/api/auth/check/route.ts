export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSessionFromCookie, isSetupComplete } from "@/lib/auth";

export async function GET() {
  const setupDone = isSetupComplete();
  if (!setupDone) {
    return NextResponse.json({ authenticated: false, setupRequired: true }, { status: 401 });
  }

  const valid = await getSessionFromCookie();
  if (!valid) {
    return NextResponse.json({ authenticated: false, setupRequired: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}
