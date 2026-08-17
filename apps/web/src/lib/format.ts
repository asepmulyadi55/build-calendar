/**
 * Number formatting for the interface.
 *
 * The copy is English; the numbers are `id-ID` (master spec §10.7). Prices read
 * `Rp1.250.000`, never `Rp1,250,000`. English copy does not imply American
 * formatting, and a price a buyer misreads is worse than one they cannot read.
 *
 * `Intl` is used here deliberately. It is forbidden inside `calendar-core`, whose
 * output must not depend on the host, but this is the view layer.
 */

const ID_GROUPING = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

function assertAmount(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number, received ${String(value)}`);
  }
  if (value < 0) {
    throw new RangeError(`${label} must not be negative, received ${String(value)}`);
  }
}

/**
 * `Rp10.000`. No space after the symbol, matching the prototype, and no decimals —
 * rupiah has no minor unit in everyday use.
 */
export function formatRupiah(amount: number): string {
  assertAmount(amount, 'amount');
  return `Rp${ID_GROUPING.format(Math.round(amount))}`;
}

/**
 * The "≈ Rp2.000 per calendar" figure on a coin package.
 *
 * Derived rather than stored, so it can never drift from the package it describes.
 * `unlockCostCoins` comes from `product_presets` (BR-C04) and is not assumed to be 1.
 */
export function formatRupiahCompactPer(
  priceIdr: number,
  coinAmount: number,
  unlockCostCoins: number,
): string {
  assertAmount(priceIdr, 'priceIdr');
  if (!Number.isFinite(coinAmount) || coinAmount <= 0) {
    throw new RangeError(`coinAmount must be a positive number, received ${String(coinAmount)}`);
  }
  if (!Number.isFinite(unlockCostCoins) || unlockCostCoins <= 0) {
    throw new RangeError(
      `unlockCostCoins must be a positive number, received ${String(unlockCostCoins)}`,
    );
  }

  return formatRupiah((priceIdr / coinAmount) * unlockCostCoins);
}

/** `1.250` — grouping without the currency symbol, for counts. */
export function formatCount(value: number): string {
  assertAmount(value, 'value');
  return ID_GROUPING.format(Math.round(value));
}
