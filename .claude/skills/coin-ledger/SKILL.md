---
name: coin-ledger
description: "Procedure for any work touching coins, coin balance, top-ups, payments, payment verification, or unlocking a project. Trigger whenever code reads or writes coin_transactions, payments, or projects.status, or whenever a task mentions coins, balance, top up, unlock, refund, or double-spend. This is the only place in the codebase that moves real money."
---

# Working on the coin ledger

This is customer money. A bug here is not a defect, it is a refund and a trust problem. Follow this exactly.

## Before writing any implementation

1. Read `BR-C01` to `BR-C07` and `BR-U01` to `BR-U08` in `docs/00-master-spec.md` §5.
2. Write the failing tests first. At minimum:
   - two concurrent unlock requests on the same project deduct exactly **one** coin
   - unlocking an already-unlocked project returns success and deducts **nothing**
   - a failed first export refunds via a compensating entry
   - the cached balance always equals the sum of the ledger

## Rules that are not negotiable

- `coin_transactions` is **append-only**. Never write an UPDATE or DELETE against it. A correction is a new row with an opposite `delta` and a `reason` explaining it.
- Deducting a coin, writing the ledger row, and changing `projects.status` happen inside **one** database transaction. Not three calls in sequence. Not a transaction plus a follow-up write.
- Double-spend is prevented by the database, not by application logic:
  ```sql
  CREATE UNIQUE INDEX unlock_once ON coin_transactions (project_id)
  WHERE reason = 'unlock';
  ```
  If you find yourself adding an `if (alreadyUnlocked)` check as the primary defence, stop. That check is a UX nicety, not the guard.
- Charge only after the **first export job succeeds**. Until then the project sits in `unlocking`.
- Every row carries a `reason` and a `reference_id`. No anonymous balance changes, including admin adjustments.
- `profiles.coin_balance_cache` is a cache. Never treat it as the source of truth, and never let a write path read it to decide whether a user can afford something. Recompute, or lock.

## Before reporting done

- [ ] The concurrency test exists and passes
- [ ] The unique index is in a migration, not just in code
- [ ] No UPDATE or DELETE on `coin_transactions` anywhere in the diff
- [ ] Admin adjustments write to `audit_logs`
