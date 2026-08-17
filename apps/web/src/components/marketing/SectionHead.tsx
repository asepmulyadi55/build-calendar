import Link from 'next/link';
import type { ReactNode } from 'react';

interface SectionHeadProps {
  eyebrow: string;
  heading: string;
  lede?: string;
  link?: { href: string; label: string };
  /** Use when the content below is narrower than the container, so the head never
   *  floats wider than what it introduces. */
  narrow?: boolean;
  children?: ReactNode;
}

/** `.sec-head` — title left, optional action right, on one full-width row. */
export function SectionHead({ eyebrow, heading, lede, link, narrow }: SectionHeadProps) {
  return (
    <div className={narrow ? 'sec-head sec-head--narrow' : 'sec-head'}>
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="sec-title">{heading}</h2>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {link && (
        <Link className="sec-link" href={link.href}>
          {link.label}
        </Link>
      )}
    </div>
  );
}
