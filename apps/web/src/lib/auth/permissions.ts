/**
 * What an account is allowed to do (P1-US-201).
 *
 * "Users may sign in before verifying but cannot top up or unlock until
 * verified." That is a server rule. Hiding a button is a courtesy; these
 * predicates are what the coin path must consult before money moves (Epic 5).
 *
 * Everything here fails closed. An unreadable record is not a verified one.
 */
export interface AuthUserLike {
  id: string;
  /** Set by the auth provider once the address is confirmed. */
  emailConfirmedAt: Date | null;
  /** Set when the owner asked for deletion (NFR-P03). */
  deletedAt: Date | null;
}

export type VerificationState = 'anonymous' | 'deleted' | 'unverified' | 'verified';

export function verificationState(user: AuthUserLike | null | undefined): VerificationState {
  if (!user) return 'anonymous';
  if (user.deletedAt instanceof Date) return 'deleted';
  if (user.emailConfirmedAt instanceof Date) return 'verified';
  return 'unverified';
}

/** BR-C01 top-ups. Verified accounts only. */
export function canTopUp(user: AuthUserLike | null | undefined): boolean {
  return verificationState(user) === 'verified';
}

/** Unlocking a project spends a coin (BR-C04). Verified accounts only. */
export function canSpendCoins(user: AuthUserLike | null | undefined): boolean {
  return verificationState(user) === 'verified';
}

/** Building and previewing are free and open to any signed-in account. */
export function canEditProjects(user: AuthUserLike | null | undefined): boolean {
  const state = verificationState(user);
  return state === 'verified' || state === 'unverified';
}
