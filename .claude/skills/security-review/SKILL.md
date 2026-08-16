---
name: security-review
description: "Read-only security audit of the codebase against this project's specific exposure. Run before accepting the first real payment, before any deploy that touches auth, uploads, payments, or admin, and every few epics. Reports findings without fixing them. Invoke with /security-review."
---

# Security review

**Write no code in this session.** Report only. Fixing during a review hides how much was wrong.

This is not a generic OWASP pass. Check the things this application can actually get wrong, in this order.

## 1. Authorization — the highest risk here

Every route that accepts an id is a potential IDOR. Check each one:

- Projects, assets, export jobs, payments, orders: is the query filtered by the caller's `user_id`, or does it rely on the route "already being authenticated"?
- Admin routes: guarded by a role check in middleware, not by obscurity of the path?
- Signed download URLs: scoped to one object, time-limited, and not guessable from a project id?

Report every route missing an ownership filter, with file and line.

## 2. Secret exposure

- Is `SUPABASE_SERVICE_ROLE_KEY` reachable from any client component, `NEXT_PUBLIC_` variable, or bundled file? Grep the built output, not just the source.
- Any API key, connection string, or bank detail committed to the repository?
- Are secrets read at runtime rather than inlined at build time?

## 3. Row Level Security

- Every table in `public` has RLS enabled with a deny-all policy?
- Any table created by a migration that skipped it?
- Does the CI check that enforces this still exist and still run?

Remember why this matters: Supabase exposes `public` tables through PostgREST using the anon key, which lives in the browser. A table without RLS is a public table.

## 4. Uploads

- Validated by magic bytes, not by extension or the client-supplied MIME type?
- Size limit enforced server-side, not only in the browser?
- EXIF stripped from every stored derivative, GPS included? These are family photos — leaked EXIF is a home address.
- Are uploads written to a private bucket, reachable only via signed URL?
- Is the original discarded after derivatives are made?

## 5. The money path

- Partial unique index on `(project_id) where reason='unlock'` present in a migration?
- Any UPDATE or DELETE against `coin_transactions` anywhere?
- Deduction, ledger write, and status change inside one transaction?
- Can a user reach an unlock or top-up endpoint for an account that is not theirs?
- Are admin balance adjustments authenticated, reasoned, and written to `audit_logs`?

## 6. The renderer

- Is outbound network access actually disabled during rendering? This is the SSRF boundary — a design that could fetch a URL could be made to read internal services.
- Can any user-supplied value reach a file path, a shell command, or an SVG that gets parsed without sanitisation?
- Is the renderer endpoint unreachable from the public internet and protected by the shared secret?

## 7. Rate limits and abuse

Present and enforced server-side: login 5/min/IP, signup 3/hour/IP, upload 30/hour/user, export 10/hour/user, max 3 queued jobs per user.

## 8. Transport and headers

CSRF protection on all mutations. CSP, HSTS, `X-Content-Type-Options` set. Cookies `HttpOnly`, `Secure`, `SameSite`.

## 9. Dependencies

Run the audit tool. Report only findings that are reachable from this application's code paths — a vulnerability in a dev-only transitive dependency is noise, and reporting it as high severity trains the owner to ignore the list.

## Output

A numbered list ordered by severity, each with:

- **File and line**
- **What an attacker could do**, concretely — not "possible information disclosure" but "any signed-in user can download another user's family photos by changing an id in the URL"
- **The smallest fix**

End with one sentence: what to fix first. Then stop.
