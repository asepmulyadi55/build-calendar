import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignInForm } from '@/components/auth/SignInForm';
import { getAuthContext } from '@/lib/auth/session';
import { safeCallbackUrl } from '@/lib/auth/redirect';
import { en } from '@/lib/i18n/en';

export const metadata: Metadata = { title: en.auth.signIn.title };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params['callbackUrl'])
    ? params['callbackUrl'][0]
    : params['callbackUrl'];
  const callbackUrl = safeCallbackUrl(raw);

  // Already signed in? Go where they were headed rather than showing a form that
  // cannot do anything useful.
  const context = await getAuthContext();
  if (context.isSignedIn && !context.isDeleted) redirect(callbackUrl);

  return (
    <>
      <span className="eyebrow">{en.auth.signIn.eyebrow}</span>
      <h1 className="page-title">{en.auth.signIn.title}</h1>
      <SignInForm callbackUrl={callbackUrl} />
    </>
  );
}
