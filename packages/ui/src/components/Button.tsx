import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * `.btn` from the design system.
 *
 * Red is semantic: `primary` marks the single most important action on a screen and
 * nothing else. Use `ghost` for everything secondary and `dark` where the design
 * calls for weight without urgency.
 */
export type ButtonVariant = 'primary' | 'ghost' | 'dark';
export type ButtonSize = 'default' | 'small';

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
  children: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  dark: 'btn-dark',
};

interface ButtonClassOptions {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  block?: boolean | undefined;
  className?: string | undefined;
}

export function buttonClassName({
  variant = 'primary',
  size = 'default',
  block = false,
  className,
}: ButtonClassOptions = {}): string {
  return [
    'btn',
    VARIANT_CLASS[variant],
    size === 'small' ? 'btn-sm' : null,
    block ? 'btn-block' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant,
  size,
  block,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={buttonClassName({ variant, size, block, className })} {...rest}>
      {children}
    </button>
  );
}

type ButtonLinkProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

/**
 * A link styled as a button. Kept separate from `Button` on purpose: navigation is
 * an anchor, and screen readers and middle-click both depend on it staying one.
 */
export function ButtonLink({
  variant,
  size,
  block,
  className,
  children,
  href,
  ...rest
}: ButtonLinkProps) {
  return (
    <a href={href} className={buttonClassName({ variant, size, block, className })} {...rest}>
      {children}
    </a>
  );
}
