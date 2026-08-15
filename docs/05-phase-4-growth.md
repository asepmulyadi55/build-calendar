# Phase 4 — Growth, Automation & Polish

> Prerequisite: Phases 1–3 running in production with real users.
> Phase goal: cut manual admin work, raise conversion, and harden print quality.
> This phase is **priority-driven, not sequential**. Work from data, not from the order of this list.

---

## Epic 16 — Payment Automation

### P4-US-1601 · Payment gateway
- [ ] Integrate a gateway (Midtrans / Xendit / Doku) for dynamic QRIS, virtual accounts, and e-wallets.
- [ ] Webhook signature verification; payments confirm automatically with no admin involvement.
- [ ] Hourly reconciliation cron comparing gateway state against local state.
- [ ] **Keep manual methods.** Many Indonesian customers trust bank transfer with proof more than a redirect flow.
- [ ] Gateway fees calculated and configurable as absorbed or passed on.
- [ ] Migration must be non-destructive: historical `payments` rows remain readable.

### P4-US-1602 · Automated WhatsApp notifications
- [ ] WhatsApp Business API (or a local provider) for: payment received, order in production, order shipped with tracking.
- [ ] Admin-managed message templates with `{nama}`, `{nomor_order}`, `{resi}`, `{kurir}` variables.
- [ ] Opt-in consent stored per user, with an unsubscribe path.
- [ ] Email fallback when WhatsApp delivery fails.

### P4-US-1603 · Courier API integration
- [ ] Fill in the `ApiRateProvider` stubbed in Phase 2.
- [ ] Automatic rates from an aggregator, with a switch back to the manual table when the API misbehaves.
- [ ] Automatic tracking updates driving `shipped → delivered`.
- [ ] Verify the chosen provider's current status and pricing before committing — the Indonesian shipping-API landscape changes often.

---

## Epic 17 — Conversion & Marketing

### P4-US-1701 · SEO and content
- [ ] Keyword landing pages. **Note the tension:** the interface is English, but Indonesian buyers search in Indonesian — "kalender meja custom", "kalender dinding foto keluarga", "cetak kalender {tahun}". Decide deliberately whether SEO landing pages are written in Indonesian while the app stays English, or whether organic search is conceded in favour of paid and social acquisition. Record the choice in `DECISIONS.md`.
- [ ] Structured data (Product, FAQPage, Organization).
- [ ] Sitemap, robots.txt, canonical tags, dynamic OG images.
- [ ] Blog: choosing photos, picking a calendar size, when to order calendars.
- [ ] Public showcase gallery — **explicit opt-in only** (NFR-P02).

### P4-US-1702 · 3D mockups and sharing
- [ ] Previews composited automatically into realistic mockups (desk calendar on a desk, wall calendar on a wall).
- [ ] "Share preview" generates a watermarked mockup image and a public link the user can revoke.
- [ ] This is organic marketing: users share their result, and their audience sees the brand.

### P4-US-1703 · Coupons, referrals, and bonuses
- [ ] Coupon codes: fixed or percentage discount, applicable to top-ups or print orders, usage limits, expiry.
- [ ] Signup bonus (e.g. one free coin) so a new user can experience watermark-free export once.
- [ ] Referral program crediting both parties after the referred user's first top-up.
- [ ] All coin grants flow through the ledger with a clear `reason` (BR-C06).

### P4-US-1704 · Analytics and funnel
- [ ] Event tracking: homepage → template selected → first photo uploaded → preview viewed → unlock clicked → top-up → export → print checkout.
- [ ] Funnel dashboard in the admin panel.
- [ ] Optional session replay with masking, to find where users stall in the editor.
- [ ] Cookie consent banner if third-party tools are used.

---

## Epic 18 — Advanced Print Quality

### P4-US-1801 · CMYK workflow
- [ ] PDF-to-CMYK conversion with an ICC profile (e.g. ISO Coated v2) via Ghostscript in the renderer.
- [ ] Export option: RGB (default) or CMYK (for offset printing).
- [ ] Out-of-gamut warnings on very saturated colors when CMYK is selected.
- [ ] PDF/X-1a output for print shops that require it.

### P4-US-1802 · Image enhancement
- [ ] Automatic low-resolution detection with actionable suggestions.
- [ ] Optional print sharpening.
- [ ] Face detection to guide crop placement so faces are not cut off — a large quality-of-life win for family photos.

### P4-US-1803 · Additional formats
- [ ] 300 DPI PNG per sheet in a ZIP.
- [ ] Screen-resolution JPG for social sharing.
- [ ] ICS export of the holiday set — a small, genuinely distinctive extra.

---

## Epic 19 — New Product Surface

### P4-US-1901 · Arbitrary start month
- [ ] Calendars can start in any month (e.g. July 2026 – June 2027) for academic use.
- [ ] `projects.start_month` already exists in the schema from Phase 1; this only enables the UI.

### P4-US-1902 · Business calendars (B2B)
- [ ] Company logo, contact details, and product-catalog slots.
- [ ] Bulk pricing, quotations, and tax invoices where required.
- [ ] A "request a quote" flow routing to admin via WhatsApp or email, rather than automated checkout.

### P4-US-1903 · Additional date layers
- [ ] Hijri dates and Javanese *pasaran* as optional grid layers.
- [ ] Personal important dates (birthdays, anniversaries) entered by the user and rendered on the calendar.
- [ ] Optional Google Calendar import, read-only.

### P4-US-1904 · Adjacent products
- [ ] Extend to photo posters, greeting cards, and planners using the same engine.
- [ ] If the Phase 1–3 architecture was respected, this is only new `product_presets` and new templates.

---

## Epic 20 — Operational Resilience

### P4-US-2001 · Monitoring
- [ ] Uptime monitoring for both web and renderer.
- [ ] Alerts when the export queue exceeds 20 items or any job runs longer than three minutes.
- [ ] Health dashboard: export success rate, p95 duration, storage usage against quota.

### P4-US-2002 · Scale and cost
- [ ] Autoscale renderer workers for peak season. **October–December is the calendar sales peak** — provision before it, not during it.
- [ ] Storage lifecycle rules moving old exports to cheaper storage classes.
- [ ] Per-user bandwidth and storage cost tracking.

### P4-US-2003 · Customer support
- [ ] Searchable help centre.
- [ ] Simple ticketing, or integration with an existing tool.
- [ ] Canned responses for the most common complaints: color differs from screen, photo looks pixelated, order is late.

---

## Recommended Priority

If only three items can be done first:

1. **P4-US-1601 (payment gateway)** — removes the most exhausting daily manual work.
2. **P4-US-1703 (free coin for new users)** — the cheapest available conversion lift; users need to feel a watermark-free result once.
3. **P4-US-1702 (3D mockups and sharing)** — the lowest-cost organic marketing for a product this visual.
