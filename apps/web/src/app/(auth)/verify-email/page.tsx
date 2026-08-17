import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ResendVerification } from '@/components/auth/ResendVerification';
import { getAuthContext } from '@/lib/auth/session';
import { safeCallbackUrl } from '@/lib/auth/redirect';
import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';

export const metadata: Metadata = { title: en.auth.verify.title };

/**
 * Where `requireVerifiedUser` sends someone who is signed in but has not confirmed
 * their address (P1-US-201). They can still browse and build; only topping up and
 * unlocking are gated.
 */
export default async function VerifyEmailPage({
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
  if (!context.isSignedIn) redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (context.isVerified) redirect(callbackUrl);

  return (
    <>
      <span className="eyebrow">{en.auth.verify.eyebrow}</span>
      <h1 className="page-title">{en.auth.verify.title}</h1>
      <p className="lede auth-lede">{en.auth.verify.lede}</p>
      <ResendVerification />
      <p className="small muted auth-alt">
        <Link href={routes.home}>{en.auth.verify.backToApp}</Link>
      </p>
    </>
  );
}
