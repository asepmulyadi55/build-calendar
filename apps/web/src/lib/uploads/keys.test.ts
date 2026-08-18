import { describe, expect, it } from 'vitest';
import { assetKey, assetKeys, ASSET_VARIANTS } from './keys';

describe('assetKey', () => {
  it('matches the layout the story specifies', () => {
    expect(assetKey('user-1', 'asset-9', 'print')).toBe('users/user-1/assets/asset-9/print.jpg');
  });

  it('covers exactly the three derivatives', () => {
    expect([...ASSET_VARIANTS].sort()).toEqual(['preview', 'print', 'thumb']);

    const keys = assetKeys('u', 'a');
    expect(Object.keys(keys).sort()).toEqual(['preview', 'print', 'thumb']);
  });

  it('scopes every variant under the owning user, so one user cannot read another', () => {
    for (const key of Object.values(assetKeys('owner-1', 'asset-1'))) {
      expect(key.startsWith('users/owner-1/')).toBe(true);
    }
  });

  it('never puts the uploaded filename in the path', () => {
    // The user's filename is attacker-controlled. `assetKey` takes an id, so
    // there is nothing to escape — this test exists so nobody adds a name later.
    expect(assetKey('u', 'a', 'thumb')).not.toMatch(/\.\.|%2e|\s/i);
  });
});
