/**
 * Object-storage keys for uploaded photos (P1-US-304).
 *
 * Separate from `actions.ts` because a `'use server'` module may only export
 * async functions — a plain helper there fails the build.
 *
 * The shape is fixed by the story: `users/{userId}/assets/{assetId}/{variant}.jpg`.
 * The user's own filename never appears in a key. It is attacker-controlled text
 * and would let someone shape a path.
 */
export const ASSET_VARIANTS = ['thumb', 'preview', 'print'] as const;

export type AssetVariant = (typeof ASSET_VARIANTS)[number];

export function assetKey(userId: string, assetId: string, variant: AssetVariant): string {
  return `users/${userId}/assets/${assetId}/${variant}.jpg`;
}

export function assetKeys(userId: string, assetId: string): Record<AssetVariant, string> {
  return {
    thumb: assetKey(userId, assetId, 'thumb'),
    preview: assetKey(userId, assetId, 'preview'),
    print: assetKey(userId, assetId, 'print'),
  };
}
