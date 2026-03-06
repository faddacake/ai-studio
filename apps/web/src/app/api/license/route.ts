import { NextResponse } from "next/server";
import { getLicenseTier, TIER_LIMITS } from "@/lib/license";

export async function GET() {
  const tier = getLicenseTier();
  return NextResponse.json({ tier, limits: TIER_LIMITS[tier] });
}
