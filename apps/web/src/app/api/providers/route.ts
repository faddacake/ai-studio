export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getDb, schema } from "@aistudio/db";

/**
 * GET /api/providers
 *
 * Returns the list of configured provider IDs.
 * Does NOT expose encrypted keys or auth tags.
 *
 * Used by /getting-started to determine whether at least one
 * provider API key has been added.
 */
export async function GET() {
  const db = getDb();
  const rows = db
    .select({
      id: schema.providerConfigs.id,
      validatedAt: schema.providerConfigs.validatedAt,
      createdAt: schema.providerConfigs.createdAt,
    })
    .from(schema.providerConfigs)
    .all();

  return NextResponse.json(rows);
}
