import 'server-only';
import { redirect } from 'next/navigation';
import { prisma } from '@buildcalendar/db';
import { createSupabaseServerClient } from './supabase-server';
import { canSpendCoins, canTopUp, verificationState, type AuthUserLike } from './permissions';

/**
 * Who is asking, and what they may do.
 *
 * One place resolves the session, so no route invents its own idea of "signed in".
 * The verified flag comes from the auth provider and the deletion flag from
 * `profiles` — a soft-deleted account can still hold a valid token until it
 * expires, and must not be treated as active in the meantime.
 */
export interface AuthContext {
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    role: 'user' | 'admin';
  } | null;
  isSignedIn: boolean;
  isVerified: boolean;
  isDeleted: boolean;
  canTopUp: boolean;
  canSpendCoins: boolean;
}

const ANONYMOUS: AuthContext = {
  user: null,
  isSignedIn: false,
  isVerified: false,
  isDeleted: false,
  canTopUp: false,
  canSpendCoins: false,
};

export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createSupabaseServerClient();

  // `getUser` revalidates the token with the auth server. `getSession` only reads
  // the cookie, which a client could have edited — never authorise on that.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return ANONYMOUS;

  const authUser = data.user;

  let profile: {
    name: string | null;
    phone: string | null;
    role: string;
    deletedAt: Date | null;
  } | null = null;
  try {
    profile = await prisma.profile.findUnique({
      where: { id: authUser.id },
      select: { name: true, phone: true, role: true, deletedAt: true },
    });
  } catch (error) {
    // The trigger creates the profile, so a missing one means the database is
    // unreachable rather than that the row does not exist. Fail closed: the
    // session is still valid for browsing, but nothing that spends money.
    console.error('[auth] profile read failed', {
      message: error instanceof Error ? error.message : 'unknown error',
    });
  }

  const userLike: AuthUserLike = {
    id: authUser.id,
    emailConfirmedAt: authUser.email_confirmed_at ? new Date(authUser.email_confirmed_at) : null,
    deletedAt: profile?.deletedAt ?? null,
  };

  const state = verificationState(userLike);

  return {
    user: {
      id: authUser.id,
      email: authUser.email ?? '',
      name: profile?.name ?? (authUser.user_metadata['name'] as string | undefined) ?? null,
      phone: profile?.phone ?? null,
      role: profile?.role === 'admin' ? 'admin' : 'user',
    },
    isSignedIn: true,
    isVerified: state === 'verified',
    isDeleted: state === 'deleted',
    // Both false without a profile: a database we cannot read is not permission.
    canTopUp: profile !== null && canTopUp(userLike),
    canSpendCoins: profile !== null && canSpendCoins(userLike),
  };
}

/** Redirects to sign-in, preserving where the caller was headed. */
export async function requireUser(callbackUrl: string): Promise<AuthContext> {
  const context = await getAuthContext();

  if (!context.isSignedIn || context.isDeleted) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return context;
}

/**
 * The gate for anything that moves coins (P1-US-201).
 *
 * Epic 5 must call this in the top-up and unlock paths. It is server-side on
 * purpose: hiding the button in the UI is not enforcement.
 */
export async function requireVerifiedUser(callbackUrl: string): Promise<AuthContext> {
  const context = await requireUser(callbackUrl);

  if (!context.isVerified) {
    redirect(`/verify-email?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return context;
}
