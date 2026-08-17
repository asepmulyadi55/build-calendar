import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { getAuthContext } from '@/lib/auth/session';
import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';

export const metadata: Metadata = { title: en.auth.reset.title };

export default async function ResetPasswordPage() {
  // The recovery link creates a session at /auth/callback before landing here.
  // No session means the link was already used or has expired — one hour, once.
  const context = await getAuthContext();

  return (
    <>
      <span className="eyebrow">{en.auth.reset.eyebrow}</span>
      <h1 className="page-title">{en.auth.reset.title}</h1>
      {context.isSignedIn ? (
        <ResetPasswordForm />
      ) : (
        <>
          <p className="auth-error" role="alert">
            {en.auth.reset.linkInvalid}
          </p>
          <p className="small muted auth-alt">
            <Link href={routes.forgotPassword}>{en.auth.reset.requestAnother}</Link>
          </p>
        </>
      )}
    </>
  );
}
