import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { en } from '@/lib/i18n/en';

export const metadata: Metadata = { title: en.auth.forgot.title };

export default function ForgotPasswordPage() {
  return (
    <>
      <span className="eyebrow">{en.auth.forgot.eyebrow}</span>
      <h1 className="page-title">{en.auth.forgot.title}</h1>
      <p className="lede auth-lede">{en.auth.forgot.lede}</p>
      <ForgotPasswordForm />
    </>
  );
}
