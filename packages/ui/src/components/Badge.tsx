import type { HTMLAttributes, ReactNode } from 'react';

/**
 * `.badge` from the design system. Small uppercase mono label.
 *
 * `red` is reserved for holiday and blocker meanings; do not reach for it because a
 * badge needs to stand out.
 */
export type BadgeTone = 'neutral' | 'ok' | 'warn' | 'red' | 'ink';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}

const TONE_CLASS: Record<BadgeTone, string | null> = {
  neutral: null,
  ok: 'badge-ok',
  warn: 'badge-warn',
  red: 'badge-red',
  ink: 'badge-ink',
};

export function Badge({ tone = 'neutral', className, children, ...rest }: BadgeProps) {
  const classes = ['badge', TONE_CLASS[tone], className].filter(Boolean).join(' ');

  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}
