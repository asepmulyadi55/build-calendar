import { ButtonLink } from '@buildcalendar/ui';
import { formatRupiah } from '@/lib/format';
import { en } from '@/lib/i18n/en';
import { routes } from '@/lib/routes';
import type { CoinPackageView } from '@/lib/data/catalog';

interface PricingPlansProps {
  packages: CoinPackageView[];
  /** The "or skip it entirely" card shown alongside on the homepage. */
  aside?: { kicker: string; title: string; body: string; cta: string; href: string };
}

/**
 * Coin packages, straight from `coin_packages` (BR-C01).
 *
 * Nothing here is written down: the price, the coin count, the badge and the
 * per-calendar figure all come from the database. The "Most popular" treatment is
 * driven by a package carrying a badge, so the owner moves it by editing a row.
 */
export function PricingPlans({ packages, aside }: PricingPlansProps) {
  // A database that cannot be read shows an honest message, not an empty grid.
  if (packages.length === 0) {
    return <p className="lede">{en.pricing.unavailable}</p>;
  }

  return (
    <div className="plans">
      {packages.map((pkg) => (
        <div className={pkg.badge ? 'plan pop' : 'plan'} key={pkg.id}>
          {pkg.badge && <span className="tag">{pkg.badge}</span>}
          <div className="coins">
            {pkg.coinAmount} {pkg.coinAmount === 1 ? en.pricing.coinUnit : en.pricing.coinsUnit}
          </div>
          <div className="price">{formatRupiah(pkg.priceIdr)}</div>
          <p className="per">
            ≈ <b>{pkg.perCalendar}</b> {en.pricing.perCalendar}
          </p>
          <ButtonLink href={routes.coins} variant={pkg.badge ? 'primary' : 'ghost'}>
            {en.pricing.choose}
          </ButtonLink>
        </div>
      ))}

      {aside && (
        <div className="plan plan-alt">
          <span className="kicker">{aside.kicker}</span>
          <h3>{aside.title}</h3>
          <p>{aside.body}</p>
          <ButtonLink href={aside.href} variant="ghost">
            {aside.cta}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
