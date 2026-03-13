/**
 * Durable artifact storage path.
 *
 * Artifacts (generated images, etc.) are written here rather than to /tmp
 * so they survive server restarts and remain viewable from the run history
 * detail page.
 *
 * `process.cwd()` resolves to apps/web at runtime (the Next.js project root),
 * so files land at  apps/web/data/artifacts/<runId>/<filename>.
 * The data/ directory is git-ignored.
 *
 * Old ArtifactRef paths pointing to /tmp/aistudio-runs/ are still served by
 * /api/artifacts for backward compatibility — they just won't survive a
 * server restart, which was already the behavior before this change.
 */
import path from "node:path";

export const ARTIFACTS_DIR = path.join(process.cwd(), "data", "artifacts");
