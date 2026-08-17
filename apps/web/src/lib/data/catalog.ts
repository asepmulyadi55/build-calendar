import 'server-only';
import { prisma } from '@buildcalendar/db';
import { formatRupiahCompactPer } from '../format';

/**
 * Coin packages and product presets, straight from the database.
 *
 * BR-C01: packages are admin-configurable and never hardcoded. BR-C04: the unlock
 * cost lives in product configuration, so the "per calendar" figure is derived from
 * both rather than written down anywhere.
 *
 * Like settings, these reads degrade rather than throw. A pricing page that cannot
 * reach the database shows nothing to buy — which is honest — instead of a stack
 * trace.
 */
export interface CoinPackageView {
  id: string;
  name: string;
  priceIdr: number;
  coinAmount: number;
  badge: string | null;
  /** Derived, never stored: `Rp2.000`. */
  perCalendar: string;
}

export interface ProductPresetView {
  id: string;
  code: string;
  name: string;
  widthMm: number;
  heightMm: number;
  sheetCount: number;
  monthsPerSheet: number;
  printBasePrice: number;
  unlockCostCoins: number;
}

/** BR-C04 default, used only when no active preset exists to read it from. */
const FALLBACK_UNLOCK_COST = 1;

export async function getProductPresets(): Promise<ProductPresetView[]> {
  try {
    return await prisma.productPreset.findMany({
      where: { isActive: true },
      orderBy: { sheetCount: 'desc' },
      select: {
        id: true,
        code: true,
        name: true,
        widthMm: true,
        heightMm: true,
        sheetCount: true,
        monthsPerSheet: true,
        printBasePrice: true,
        unlockCostCoins: true,
      },
    });
  } catch (error) {
    console.error('[catalog] product preset read failed', {
      message: error instanceof Error ? error.message : 'unknown error',
    });
    return [];
  }
}

/**
 * The cost of opening one calendar. Presets may in principle differ, so the
 * cheapest is used — the pricing page says "per calendar", and quoting the highest
 * would overstate what a buyer pays.
 */
export function unlockCostFrom(presets: ProductPresetView[]): number {
  const costs = presets.map((preset) => preset.unlockCostCoins).filter((cost) => cost > 0);
  return costs.length > 0 ? Math.min(...costs) : FALLBACK_UNLOCK_COST;
}

export async function getCoinPackages(unlockCostCoins: number): Promise<CoinPackageView[]> {
  try {
    const packages = await prisma.coinPackage.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { priceIdr: 'asc' }],
      select: {
        id: true,
        name: true,
        priceIdr: true,
        coinAmount: true,
        badge: true,
      },
    });

    return packages.map((pkg) => ({
      ...pkg,
      perCalendar: formatRupiahCompactPer(pkg.priceIdr, pkg.coinAmount, unlockCostCoins),
    }));
  } catch (error) {
    console.error('[catalog] coin package read failed', {
      message: error instanceof Error ? error.message : 'unknown error',
    });
    return [];
  }
}

/** Everything the pricing and homepage sections need, in one round trip each. */
export async function getCatalog(): Promise<{
  presets: ProductPresetView[];
  packages: CoinPackageView[];
  unlockCostCoins: number;
}> {
  const presets = await getProductPresets();
  const unlockCostCoins = unlockCostFrom(presets);
  const packages = await getCoinPackages(unlockCostCoins);

  return { presets, packages, unlockCostCoins };
}
