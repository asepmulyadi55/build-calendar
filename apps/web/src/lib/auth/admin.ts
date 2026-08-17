import 'server-only';
import { notFound } from 'next/navigation';
import { getAuthContext, requireUser, type AuthContext } from './session';

/**
 * Guards every admin route (NFR-S08).
 *
 * A signed-in non-admin gets 404, not 403. Confirming that `/admin/templates`
 * exists tells someone probing exactly where to keep trying; a missing page tells
 * them nothing.
 *
 * This is the boundary. The navigation hiding a link is not.
 */
export async function requireAdmin(callbackUrl: string): Promise<AuthContext> {
  const context = await requireUser(callbackUrl);
  if (context.user?.role !== 'admin') notFound();
  return context;
}

/** For rendering decisions only — never for authorisation. */
export async function isAdmin(): Promise<boolean> {
  const context = await getAuthContext();
  return context.user?.role === 'admin';
}
