import { timingSafeEqual } from 'node:crypto';

/**
 * The renderer is not publicly exposed (see `infra/docker-compose.yml`, where it is
 * `expose`d to the Compose network rather than published). This is the second lock:
 * every authenticated route requires `RENDERER_SHARED_SECRET`.
 *
 * Compared in constant time so the secret cannot be recovered a byte at a time by
 * timing the 401. An empty configured secret matches nothing — the safe failure is
 * a closed service, not an open one.
 */
export function secretMatches(configured: string, provided: string | undefined): boolean {
  if (!configured || !provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(configured);

  // `timingSafeEqual` throws on a length mismatch, so length is checked first. The
  // length of a secret is not the secret.
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
