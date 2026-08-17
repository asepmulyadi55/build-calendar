import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@buildcalendar/ui';
import { DeleteAccountForm } from '@/components/auth/DeleteAccountForm';
import { ProfileForm } from '@/components/auth/ProfileForm';
import { UpdatePasswordForm } from '@/components/auth/UpdatePasswordForm';
import { signOutAction } from '@/lib/auth/actions';
import { requireUser } from '@/lib/auth/session';
import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';

export const metadata: Metadata = { title: en.auth.account.title };

/** Account settings (P1-US-203). */
export default async function AccountPage() {
  const context = await requireUser(routes.account);
  const user = context.user!;

  return (
    <>
      <header className="page-head">
        <div className="wrap">
          <span className="eyebrow">{en.auth.account.eyebrow}</span>
          <h1 className="page-title">{en.auth.account.title}</h1>
        </div>
      </header>

      <section className="section-flush">
        <div className="wrap account-grid">
          <div className="card">
            <div className="row-between">
              <b className="h3">{en.auth.account.profileHeading}</b>
              <Badge tone={context.isVerified ? 'ok' : 'warn'}>
                {context.isVerified ? en.auth.account.verified : en.auth.account.unverified}
              </Badge>
            </div>
            <p className="muted small account-lede">{en.auth.account.profileLede}</p>

            <div className="field account-email">
              <label htmlFor="account-email">{en.auth.account.email}</label>
              {/* Displayed, not editable in Phase 1. */}
              <input className="input" id="account-email" value={user.email} disabled readOnly />
              <span className="hint">{en.auth.account.emailLocked}</span>
            </div>

            {!context.isVerified && (
              <p className="auth-error account-verify">
                {en.auth.verify.bannerText}{' '}
                <Link href={routes.verifyEmail}>{en.auth.verify.bannerAction}</Link>
              </p>
            )}

            <ProfileForm name={user.name ?? ''} phone={user.phone ?? ''} />
          </div>

          <div className="card">
            <b className="h3">{en.auth.account.passwordHeading}</b>
            <p className="muted small account-lede">{en.auth.account.passwordLede}</p>
            <UpdatePasswordForm />
          </div>

          <div className="card card-muted">
            <b className="h3">{en.auth.account.dangerHeading}</b>
            <p className="muted small account-lede">{en.auth.account.dangerLede}</p>
            <DeleteAccountForm email={user.email} />
          </div>

          <form action={signOutAction}>
            <button type="submit" className="btn btn-ghost">
              {en.auth.account.signOut}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
