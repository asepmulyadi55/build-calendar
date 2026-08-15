---
name: build-ui
description: "Procedure for building or changing any user-facing page or component. Trigger whenever a task involves a page, screen, form, layout, styling, Tailwind, or a component. The design already exists as a clickable prototype and must be translated rather than reinvented."
---

# Building a screen

The design is finished. It lives in `design/` as static HTML, and `design/assets/ds.css` is the source of every token. Your job is to translate it, not to design.

## Before writing markup

1. Open the matching page in `design/`. The mapping is in `design/sitemap.html`.
2. Find the components you need in `design/assets/ds.css`. They already exist: `.btn`, `.card`, `.field`, `.badge`, `.tbl`, `.check`, `.cal`, `.sec-head`.

## Rules

- **Use existing tokens.** No new colour, type size, spacing value, or radius unless the design genuinely lacks one — and if it does, add it to the Tailwind config as a token, never inline.
- **One layout spine.** `--maxw` is 1560px and every content block shares that left edge. Only backgrounds bleed edge to edge; content never does.
- **Prose caps at `--measure` (68ch)** regardless of container width.
- **A section head spans exactly the width of the content it introduces**, never wider.
- **Red is semantic.** It marks holidays and the single primary action. It is never decorative.
- Calendar output renders in Indonesian; everything around it is English. See the `calendar-output` skill.

## Two bugs already made in this codebase — do not repeat them

Both came from making a container `display:flex` when its children include raw text and inline links. Flex turns every text node and every `<a>` into a separate flex item, shredding the sentence into columns.

- A checkbox label containing links is `display:block` with the input absolutely positioned. See `.check`.
- A paragraph with a bold lead-in and a rule down its side is a block, not a flex row. See `.promise`.

If a container holds a sentence, it is not a flex container.

## Accessibility floor

Visible focus states, WCAG AA contrast, everything outside the canvas keyboard reachable, `prefers-reduced-motion` respected. The editor may require ≥1024px, but preview, unlock, export and payment must work on a phone. Most Indonesian traffic is mobile and the payment path must never be blocked.

## Before reporting done

- [ ] Compared side by side against the prototype page
- [ ] No hardcoded hex, px size, or spacing value in the diff
- [ ] Works at 380px, 880px, and 1560px
- [ ] No flex container wrapping a sentence
