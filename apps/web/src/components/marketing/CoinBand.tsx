import { en, fill } from '@/lib/i18n/en';

/**
 * The coin explainer.
 *
 * This is the product's main differentiator and the most common source of
 * confusion, so the wording is the prototype's, unchanged. The only substitution is
 * the per-calendar figure, which is derived from the cheapest active coin package
 * and the unlock cost (BR-C01, BR-C04) — writing it as a literal would make the
 * page lie the moment an admin changes a price.
 *
 * When no package exists to derive it from, that one sentence is dropped rather
 * than shown with a placeholder.
 */
export function CoinBand({ perCalendar }: { perCalendar: string | null }) {
  return (
    <section className="coinband">
      <div className="wrap">
        <span className="eyebrow">{en.home.coins.eyebrow}</span>
        <h2 className="coin-h">
          {en.home.coins.headingLead}
          <em>{en.home.coins.headingEmphasis}</em>
          {en.home.coins.headingTail}
        </h2>

        <div className="coinflow">
          {en.home.coins.steps.map((step) => {
            const needsPrice = step.body.includes('{perCalendar}');
            if (needsPrice && !perCalendar) return null;

            return (
              <div className="cf" key={step.kicker}>
                <span className="mono">{step.kicker}</span>
                <b>{step.title}</b>
                <p>{perCalendar ? fill(step.body, { perCalendar }) : step.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
