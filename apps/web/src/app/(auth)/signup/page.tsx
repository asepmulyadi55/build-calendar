import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { getAuthContext } from '@/lib/auth/session';
import { safeCallbackUrl } from '@/lib/auth/redirect';
import { en } from '@/lib/i18n/en';

export const metadata: Metadata = { title: en.auth.signUp.title };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params['callbackUrl'])
    ? params['callbackUrl'][0]
    : params['callbackUrl'];
  const callbackUrl = safeCallbackUrl(raw);

  const context = await getAuthContext();
  if (context.isSignedIn && !context.isDeleted) redirect(callbackUrl);

  return (
    <>
      <span className="eyebrow">{en.auth.signUp.eyebrow}</span>
      <h1 className="page-title">{en.auth.signUp.title}</h1>
      <SignUpForm callbackUrl={callbackUrl} />
    </>
  );
}
