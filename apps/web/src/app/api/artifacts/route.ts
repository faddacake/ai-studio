export const runtime = "nodejs";

/**
 * GET /api/artifacts?path=<absolute-path>
 *
 * Serves a local artifact file produced by the engine (e.g. generated images).
 * Only files under /tmp/aistudio-runs/ are allowed — all other paths are rejected.
 */
import fs from "node:fs/promises";
import path from "node:path";

const ALLOWED_PREFIX = path.normalize("/tmp/aistudio-runs/");

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
  if (!normalized.startsWith(ALLOWED_PREFIX)) {
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
