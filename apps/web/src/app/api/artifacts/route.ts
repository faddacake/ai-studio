export const runtime = "nodejs";

/**
 * GET /api/artifacts?path=<absolute-path>
 *
 * Serves a local artifact file produced by the engine (e.g. generated images).
 *
 * Allowed prefixes:
 *   1. ARTIFACTS_DIR (apps/web/data/artifacts/) — durable storage, survives restarts
 *   2. /tmp/aistudio-runs/                      — legacy transient storage; refs
 *      written before the durable-storage change still work as long as the
 *      server has not restarted since those files were written.
 *
 * All other paths are rejected with 403.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { ARTIFACTS_DIR } from "@/lib/artifactStorage";

const ALLOWED_PREFIXES = [
  path.normalize(ARTIFACTS_DIR) + path.sep,
  path.normalize("/tmp/aistudio-runs") + path.sep,
];

const MIME_BY_EXT: Record<string, string> = {
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const filePath = url.searchParams.get("path");

  if (!filePath) {
    return new Response("Missing path parameter", { status: 400 });
  }

  // Normalize to resolve any ".." components and validate the prefix
  const normalized = path.normalize(filePath);
  const allowed = ALLOWED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
  if (!allowed) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const buffer = await fs.readFile(normalized);
    const ext = path.extname(normalized).toLowerCase();
    const mimeType = MIME_BY_EXT[ext] ?? "application/octet-stream";

    return new Response(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
