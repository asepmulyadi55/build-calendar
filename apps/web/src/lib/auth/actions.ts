'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@buildcalendar/db';
import { en, fill } from '../i18n/en';
import { normaliseWhatsAppNumber } from '../whatsapp';
import { appUrl, REMEMBER_ME_COOKIE, REMEMBER_ME_MAX_AGE_SECONDS } from './config';
import { authErrorMessage, signUpOutcomeMessage } from './errors';
import { validatePassword } from './password';
import { rateLimiter, type RateLimitedAction } from './rate-limit';
import { safeCallbackUrl } from './redirect';
import { getAuthContext } from './session';
import { createSupabaseServerClient } from './supabase-server';
import { createSupabaseAdminClient } from './supabase-admin';

/**
 * Auth server actions.
 *
 * Server actions carry Next's built-in Origin check, which is the CSRF protection
 * NFR-S06 asks for on mutations.
 *
 * Every failure returns a message from `en.ts`. None of them says whether an email
 * address is registered — see `errors.ts`.
 */
export interface ActionState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
}

/** The caller's IP, for the per-IP limits in NFR-S02. */
async function callerIp(): Promise<string | null> {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? null;
  return headerList.get('x-real-ip');
}

async function enforceRateLimit(action: RateLimitedAction): Promise<string | null> {
  const result = rateLimiter.check(action, await callerIp());
  if (result.allowed) return null;
  return fill(en.auth.errors.rateLimited, { seconds: result.retryAfterSeconds });
}

function readEmail(formData: FormData): string {
  return String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_ERRORS = {
  required: en.auth.errors.passwordRequired,
  whitespaceOnly: en.auth.errors.passwordWhitespaceOnly,
  tooShort: en.auth.errors.passwordTooShort,
  tooLong: en.auth.errors.passwordTooLong,
} as const;

// ── Registration (P1-US-201) ───────────────────────────────────────────────────

export async function signUpAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const limited = await enforceRateLimit('signup');
  if (limited) return { error: limited };

  const name = String(formData.get('name') ?? '').trim();
  const email = readEmail(formData);
  const password = String(formData.get('password') ?? '');
  const whatsappRaw = String(formData.get('whatsapp') ?? '').trim();
  const acceptedTerms = formData.get('terms') === 'on';

  const fieldErrors: Record<string, string> = {};

  if (name.length === 0) fieldErrors['name'] = en.auth.errors.nameRequired;
  if (!EMAIL_PATTERN.test(email)) fieldErrors['email'] = en.auth.errors.emailInvalid;

  const passwordProblem = validatePassword(password);
  if (passwordProblem) fieldErrors['password'] = PASSWORD_ERRORS[passwordProblem];

  // Optional, but if given it has to be usable — an unreachable number is worse
  // than none, because the owner will try to use it for an order update.
  let phone: string | null = null;
  if (whatsappRaw.length > 0) {
    phone = normaliseWhatsAppNumber(whatsappRaw);
    if (!phone) fieldErrors['whatsapp'] = en.auth.errors.whatsappInvalid;
  }

  if (!acceptedTerms) fieldErrors['terms'] = en.auth.errors.termsRequired;

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // The trigger on auth.users copies these into `profiles` (§5.4).
      data: { name, ...(phone ? { phone } : {}) },
      emailRedirectTo: appUrl('/auth/callback'),
    },
  });

  if (error) {
    // "User already registered" must not reach the user. Supabase obfuscates the
    // response for a repeat signup precisely so the outcome can look identical.
    if (!/already registered/i.test(error.message)) {
      console.warn('[auth] signup failed', { code: error.code });
      return { error: authErrorMessage(error.message) };
    }
  }

  return { success: signUpOutcomeMessage() };
}

// ── Sign in and out (P1-US-202) ────────────────────────────────────────────────

export async function signInAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const limited = await enforceRateLimit('login');
  if (limited) return { error: limited };

  const email = readEmail(formData);
  const password = String(formData.get('password') ?? '');
  const rememberMe = formData.get('rememberMe') === 'on';
  const callbackUrl = safeCallbackUrl(String(formData.get('callbackUrl') ?? ''));

  if (email.length === 0 || password.length === 0) {
    return { error: en.auth.errors.invalidCredentials };
  }

  const supabase = await createSupabaseServerClient();

  // Set the preference before signing in, so the session cookies are written with
  // the right lifetime the first time rather than on the next request.
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  cookieStore.set(REMEMBER_ME_COOKIE, rememberMe ? '1' : '0', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(rememberMe ? { maxAge: REMEMBER_ME_MAX_AGE_SECONDS } : {}),
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: authErrorMessage(error?.message) };
  }

  // A closed account can still hold a valid token until it expires.
  const profile = await prisma.profile
    .findUnique({ where: { id: data.user.id }, select: { deletedAt: true } })
    .catch(() => null);

  if (profile?.deletedAt) {
    await supabase.auth.signOut();
    return { error: en.auth.errors.accountDeleted };
  }

  redirect(callbackUrl);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const { cookies } = await import('next/headers');
  (await cookies()).delete(REMEMBER_ME_COOKIE);

  redirect('/');
}

// ── Password reset (P1-US-202) ─────────────────────────────────────────────────

export async function requestPasswordResetAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const limited = await enforceRateLimit('passwordReset');
  if (limited) return { error: limited };

  const email = readEmail(formData);
  if (!EMAIL_PATTERN.test(email)) {
    return { fieldErrors: { email: en.auth.errors.emailInvalid } };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: appUrl('/auth/callback?next=/reset-password'),
  });

  if (error) console.warn('[auth] reset request failed', { code: error.code });

  // Always the same answer. Telling the caller whether the address exists is the
  // enumeration hole this whole story is trying to avoid.
  return { success: en.auth.forgot.sent };
}

export async function resetPasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirmPassword') ?? '');

  const problem = validatePassword(password);
  if (problem) return { fieldErrors: { password: PASSWORD_ERRORS[problem] } };
  if (password !== confirm) {
    return { fieldErrors: { confirmPassword: en.auth.errors.passwordMismatch } };
  }

  const supabase = await createSupabaseServerClient();

  // The recovery link established a session at /auth/callback. No session means
  // the link was already used or has expired — both are one hour, single use.
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: en.auth.reset.linkInvalid };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: authErrorMessage(error.message) };

  redirect('/account');
}

// ── Account settings (P1-US-203) ───────────────────────────────────────────────

export async function updateProfileAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await getAuthContext();
  if (!context.user) return { error: en.auth.errors.signInRequired };

  const name = String(formData.get('name') ?? '').trim();
  const whatsappRaw = String(formData.get('whatsapp') ?? '').trim();

  const fieldErrors: Record<string, string> = {};
  if (name.length === 0) fieldErrors['name'] = en.auth.errors.nameRequired;

  let phone: string | null = null;
  if (whatsappRaw.length > 0) {
    phone = normaliseWhatsAppNumber(whatsappRaw);
    if (!phone) fieldErrors['whatsapp'] = en.auth.errors.whatsappInvalid;
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Scoped to the caller's own id. "The route is already authenticated" is how
  // IDOR bugs get written.
  await prisma.profile.update({
    where: { id: context.user.id },
    data: { name, phone },
  });

  revalidatePath('/account');
  return { success: en.auth.account.profileSaved };
}

export async function updatePasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await getAuthContext();
  if (!context.user) return { error: en.auth.errors.signInRequired };

  const currentPassword = String(formData.get('currentPassword') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');

  const problem = validatePassword(newPassword);
  if (problem) return { fieldErrors: { newPassword: PASSWORD_ERRORS[problem] } };

  const supabase = await createSupabaseServerClient();

  // Re-authenticate. Without this, anyone who finds an unlocked laptop can change
  // the password and take the account with its coin balance.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: context.user.email,
    password: currentPassword,
  });
  if (reauthError) return { fieldErrors: { currentPassword: en.auth.errors.invalidCredentials } };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: authErrorMessage(error.message) };

  return { success: en.auth.account.passwordSaved };
}

export async function deleteAccountAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await getAuthContext();
  if (!context.user) return { error: en.auth.errors.signInRequired };

  const typed = String(formData.get('confirmEmail') ?? '')
    .trim()
    .toLowerCase();

  if (typed !== context.user.email.toLowerCase()) {
    return { fieldErrors: { confirmEmail: en.auth.account.dangerConfirmMismatch } };
  }

  // A soft delete (NFR-P03). The row survives so financial records can be
  // anonymised rather than orphaned; a purge job removes photos, projects and
  // exports within 7 days.
  await prisma.profile.update({
    where: { id: context.user.id },
    data: { deletedAt: new Date() },
  });

  // Revoke every existing session, so the account is closed on other devices too.
  try {
    const admin = createSupabaseAdminClient();
    await admin.auth.admin.signOut(context.user.id, 'global');
  } catch (error) {
    console.error('[auth] could not revoke sessions for a deleted account', {
      message: error instanceof Error ? error.message : 'unknown error',
    });
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect('/?deleted=1');
}

// ── Email verification (P1-US-201) ─────────────────────────────────────────────

export async function resendVerificationAction(): Promise<ActionState> {
  const limited = await enforceRateLimit('signup');
  if (limited) return { error: limited };

  const context = await getAuthContext();
  if (!context.user) return { error: en.auth.errors.signInRequired };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: context.user.email,
    options: { emailRedirectTo: appUrl('/auth/callback') },
  });

  if (error) return { error: authErrorMessage(error.message) };
  return { success: en.auth.verify.resent };
}
