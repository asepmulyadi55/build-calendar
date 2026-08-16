---
name: testing-standards
description: "What must have tests, what must not, and when tests are written. Trigger whenever writing tests, deciding whether something needs a test, setting up the test environment, or closing out a story that touches a BR-* or RQ-MEM-* rule. Prevents both untested money paths and worthless coverage padding."
---

# Testing standards

The owner has 8 hours a week and cannot manually verify your work. Tests are how a claim of "done" becomes checkable. That makes *which* tests exist matter more than how many.

## Write the test first — for these only

Test-first is mandatory when the work touches a rule tagged `BR-*` or `RQ-MEM-*`. For everything else, test-after is fine and often better.

The reason is narrow: these rules describe behaviour under conditions that are hard to reproduce once the code exists — concurrency, failure, resource limits. If you write the implementation first, you will write a test that confirms what you built rather than what was required.

## Must have tests

| Area | The test that matters |
|---|---|
| Coin unlock | Two concurrent requests deduct exactly one coin |
| Coin ledger | Cached balance equals the sum of the ledger, after a random sequence of operations |
| Refund path | A failed first export produces a compensating entry |
| Ownership | User A cannot read, export, or unlock User B's project — for every route that takes an id |
| Upload validation | A renamed `.exe` with a JPEG extension is rejected by magic bytes |
| EXIF | GPS data is absent from every stored derivative |
| calendar-core | Leap-year February, a month starting Sunday, Monday vs Sunday week start, two holidays on one date |
| Renderer output | Page dimensions in points, within 0.5 mm, for every product preset |
| Renderer memory | A2 single sheet completes under `docker run -m 1g` |

Name these tests after the rule they prove: `BR-U02 — unlocking twice deducts one coin`. When a rule changes, the failing test tells you which rule.

## Do not write these

They cost time to maintain and prove nothing:

- Tests that mock Prisma to confirm Prisma was called
- Render-smoke tests that assert no expectation
- Snapshot tests of markup, which break on every legitimate edit
- Coverage padding on getters, DTOs, and config objects

Coverage percentage is not a goal here and should not be reported as one.

## Use a real database for business rules

Do not mock the database when testing `BR-*` rules. The guarantees being tested **are database guarantees** — a unique partial index, a transaction boundary. Mocking Prisma to test a unique index tests your mock.

Run integration tests against a real Postgres. A local container is fine; the schema comes from the same migrations as production.

## Determinism

- Freeze the clock. A calendar test that depends on today's date will fail in a future month and you will not know why.
- Use fixed years in calendar tests. 2027 is the reference year in this project, and 1 January 2027 is a Friday.
- No random data without a fixed seed.
- A flaky test is fixed or deleted. Never retried, never skipped with a comment.

## Before reporting done

- [ ] Every `BR-*` and `RQ-MEM-*` rule this story touched has a named test
- [ ] Business-rule tests run against a real database, not a mock
- [ ] No test depends on the current date
- [ ] The suite passes from a clean checkout, not just on your machine
