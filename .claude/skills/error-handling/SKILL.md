---
name: error-handling
description: "How failures are surfaced, logged, and recovered from in this codebase. Trigger whenever writing a try/catch, an API route, a queue job, an external service call, or a user-facing error message. Failure has a specific shape here: a 1 GB server, an async queue, and payments verified by hand."
---

# Handling failure

Three audiences see every failure, and they need different things:

| Audience | Needs |
|---|---|
| The user | Plain English, what to do next, no internals |
| The owner | Enough detail to act, reachable from the admin panel or logs |
| The logs | Structured, searchable, free of secrets and personal data |

Never let one audience's needs leak into another's output.

## User-facing errors

- Short sentence, plain vocabulary, written for a reader whose first language is not English.
- Say what to do next. Almost always: retry, or contact us on WhatsApp.
- Include a **trace ID** the user can quote. This is the single thing that makes a solo operator able to support anyone.
- All copy lives in `en.ts`. No error string constructed inline.
- Never expose stack traces, SQL, file paths, internal service names, or model field names.

## Auth and payments

- Sign-in errors must not reveal whether an email is registered.
- Payment verification errors must not reveal amounts, unique codes, or other users' data.
- A rejected payment tells the user it was rejected and to contact us. The reason is for the admin log, not the user-facing message.

## The renderer

A render failure must fail **the job**, never the process. On the 1 GB server, a crashed renderer process takes the queue with it, and an unreleased Chromium takes the website with it.

- Wrap the whole job. On any throw: kill Chromium, mark the job `failed`, record the message, release memory.
- Retry twice with backoff, then stop. Infinite retry on a memory failure is a loop that repeatedly OOMs the box.
- On timeout (`RQ-MEM-08`, 5 minutes), kill and fail. Do not extend the timeout to make a case pass.
- The job's error message is stored on `export_jobs` and shown to the user with the trace ID.

## The money path

Distinguish two failure types, because they have opposite consequences:

- **System fault** — render crashed, storage unreachable, timeout. The coin is refunded automatically via a compensating ledger entry (`BR-U08`). The user is told it was our fault.
- **User fault** — validation blocker, missing image, unsupported file. No coin was ever charged, because charging happens only after the first successful export.

If you cannot tell which one occurred, treat it as a system fault and refund. Being wrong in the user's favour costs Rp2.000. Being wrong the other way costs a customer.

## External services

Every one needs a defined degraded behaviour. Never leave a flow hanging.

| Service | If it fails |
|---|---|
| R2 | Fail the operation with a clear message; never write the blob to Postgres as a fallback |
| Supabase | Show a maintenance message; do not retry writes that may have partially applied |
| Email | Log and continue. A missing receipt must not block a top-up |
| WhatsApp link | It is a plain URL, so it cannot fail. Do not add an integration to "check" it |

## Logging

- Structured, with the trace ID.
- **Never log:** the service-role key, any API key, payment proof contents, user photo bytes, passwords, or full email addresses in plain text.
- Never swallow an error. An empty `catch {}` is a defect, not a style choice.
- Log at the boundary where you can add context, not at every layer on the way up.

## Before reporting done

- [ ] Every user-facing message is in `en.ts` and carries a trace ID
- [ ] No stack trace or internal identifier reachable by a user
- [ ] The renderer path kills Chromium on every exit route, including throws
- [ ] System-fault refunds are automatic and tested
- [ ] No empty catch block in the diff
