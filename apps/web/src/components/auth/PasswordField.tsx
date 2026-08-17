'use client';

import { useId, useState } from 'react';
import { passwordStrength } from '@/lib/auth/password';
import { en } from '@/lib/i18n/en';
import { FieldError } from './FormFeedback';

interface PasswordFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  autoComplete: 'current-password' | 'new-password';
  /** P1-US-201 asks for a strength indicator on the fields that set a password. */
  showStrength?: boolean;
  error?: string | undefined;
  hint?: React.ReactNode;
}

export function PasswordField({
  name,
  label,
  placeholder,
  autoComplete,
  showStrength = false,
  error,
  hint,
}: PasswordFieldProps) {
  const id = useId();
  const [value, setValue] = useState('');
  const strength = passwordStrength(value);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        className="input"
        id={id}
        name={name}
        type="password"
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        minLength={8}
        onChange={(event) => {
          if (showStrength) setValue(event.target.value);
        }}
      />

      {showStrength && value.length > 0 && (
        <>
          {/* Advice, not a rule: a weak-but-legal password is still accepted.
              The server decides, in validatePassword. */}
          <div className="pw-meter" aria-hidden="true">
            {[1, 2, 3, 4].map((segment) => (
              <i
                key={segment}
                className={segment <= strength.score ? `on-${strength.score}` : undefined}
              />
            ))}
          </div>
          <p className="pw-label" role="status">
            {en.auth.password.strengthLabel}: {strength.label}
          </p>
        </>
      )}

      {hint}
      <FieldError message={error} />
    </div>
  );
}
