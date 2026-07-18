/**
 * Minimal in-memory sliding-window rate limiter for auth actions.
 * Per-instance only (resets on redeploy, not shared across replicas) — good
 * enough for dev and single-instance deploys; swap for a Redis/Upstash-backed
 * limiter when scaling out.
 */

type Window = { count: number; resetAt: number };
const windows = new Map<string, Window>();

export function rateLimit(key: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const w = windows.get(key);
  if (!w || now > w.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  w.count += 1;
  if (w.count > limit) return false;
  return true;
}

// Opportunistic cleanup so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, w] of windows) if (now > w.resetAt) windows.delete(k);
}, 5 * 60_000).unref?.();
