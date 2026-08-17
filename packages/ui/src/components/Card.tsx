import type { HTMLAttributes, ReactNode } from 'react';

/** `.card` from the design system: white surface, hairline rule, no radius. */
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Dashed outline on a transparent ground — the "not yet available" treatment. */
  muted?: boolean;
  className?: string;
  children: ReactNode;
}

export function Card({ muted = false, className, children, ...rest }: CardProps) {
  const classes = ['card', muted ? 'card-muted' : null, className].filter(Boolean).join(' ');

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
