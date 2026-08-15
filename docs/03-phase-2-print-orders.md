# Phase 2 — Physical Print Orders & Shipping

> Prerequisite: Phase 1 is live in production.
> Phase goal: a user can order their calendar printed and delivered, pay by transfer or QRIS, and track the shipment.
> **Lock decisions 4, 5, 6, and 7 from master §12 before starting.**

---

## Definition of Done

- [ ] A user can order a print from a project, choose a courier, pay, and receive a tracking number.
- [ ] An admin can process orders from one board, download print files, and update status.
- [ ] The amount a user pays always equals a server-side recalculation — no price is ever trusted from the client.
- [ ] A paid order freezes the design (BR-O07) and unlocks the project for free (BR-O05).
- [ ] Weight, shipping, and total calculations have automated tests.

---

## Epic 8 — Print Catalog

### P2-US-801 · Print product options
- [ ] Extend `product_presets` with print options: paper, finishing, binding, pricing.
- [ ] New table `print_options` (id, preset_id, group `paper|finishing|binding`, name, price_delta, weight_delta_gram, is_default, is_active).
- [ ] Seed data:
  - Paper: Art Paper 150gsm (default), Art Carton 230gsm, Ivory 260gsm
  - Finishing: none (default), matte lamination, glossy lamination
  - Binding: wire spiral (default for desk), metal ring, wall hanger
- [ ] All prices and weights admin-managed.
- [ ] Quantity tiers (`price_tiers`): 1–4, 5–9, 10–24, 25+ with decreasing unit price.

### P2-US-802 · Print information page
- [ ] Public `/printing` page covering materials, output samples, production time, and delivery coverage.
- [ ] Simple public price calculator (type + quantity → estimate before shipping).
- [ ] Production time shown as a working-day range from `settings.production_days`.

---

## Epic 9 — Addresses & Shipping

### P2-US-901 · Address book
- [ ] CRUD shipping addresses: recipient name, phone, province, city/regency, district, postal code, full address, courier notes.
- [ ] One address can be marked default.
- [ ] Cascading region dropdowns (province → city → district) served from the local `regions` table, not an external service.
- [ ] Indonesian phone validation, normalized and stored as `+62…`. Region and courier names remain Indonesian per master §10.7.

### P2-US-902 · Shipping rates (adapter architecture)
**Build this as a swappable interface from day one.**

- [ ] Define `ShippingProvider` with `getRates({ originId, destinationId, weightGram, itemValue }) → Rate[]`, where `Rate = { courier, service, description, cost, etd }`.
- [ ] **Phase 2 implementation: `ManualRateProvider`** — rates from a `shipping_rates` table (courier, service, zone, price_per_kg, min_weight_kg, etd_text) mapped through `region_zones`, all admin-managed.
- [ ] Stub `ApiRateProvider` (Biteship, RajaOngkir/Komerce, or similar) for Phase 4. The active provider is selected via `settings.shipping_provider`.
- [ ] Weight formula: `(weight_per_sheet × sheet_count × qty) + packaging_weight`, rounded up to the next kilogram.
- [ ] Couriers shown are admin-configurable: JNE, J&T, SiCepat, POS, Anteraja, plus a "pickup in person" option at zero cost.
- [ ] If the provider fails or times out, show a clear message and a "check shipping via WhatsApp" fallback. Never leave checkout hanging.
- [ ] Rate results cached six hours per (destination, weight) pair.

---

## Epic 10 — Checkout

### P2-US-1001 · Checkout flow
- [ ] Entered from the project page via "Order a print".
- [ ] Print-readiness validation runs first; blockers stop checkout.
- [ ] Step 1 — **Product options**: paper, finishing, binding, quantity, with a live unit-price summary.
- [ ] Step 2 — **Address**: pick from the address book or enter a new one.
- [ ] Step 3 — **Shipping**: list of services with cost and estimated days.
- [ ] Step 4 — **Review and pay**: itemized costs, notes for the admin, payment method.
- [ ] **Design-freeze warning** displayed prominently before the pay button: once payment is confirmed, the design for this order can no longer change (BR-O07).
- [ ] Every price is **recalculated server-side** when the order is created; client values are display-only.
- [ ] Order number format `INV/{YYYYMMDD}/{sequence}`.
- [ ] On creation, the design snapshot is written to R2 and referenced by `design_snapshot_key` — a copy, never a reference to the live project.

### P2-US-1002 · Order payment
- [ ] Methods: **manual bank transfer** and **static QRIS** (QRIS image from `settings`).
- [ ] Same mechanics as top-up: unique code, 24-hour window, proof upload, admin verification.
- [ ] QRIS payers also upload a screenshot; Phase 2 is not automated.
- [ ] On admin approval: order → `paid`, project unlocked free (BR-O05), design frozen, email sent plus a manual WhatsApp message.
- [ ] Unpaid orders expire after 24 hours via cron, with a reminder email at hour 12.

### P2-US-1003 · User order pages
- [ ] `/app/orders` lists orders with color-coded status badges.
- [ ] `/app/orders/[id]` shows line items, address, cost breakdown, payment instructions (if unpaid), status timeline, tracking number with a tracking link, and a WhatsApp button prefilled with the order number.
- [ ] "Download the file we printed" available after `paid`, served from the snapshot rather than the current design.
- [ ] "Order again" duplicates a previous order.
- [ ] Self-service cancellation only while `pending_payment`.

---

## Epic 11 — Admin Operations

### P2-US-1101 · Order board
- [ ] `/admin/orders` as a column board by status: Awaiting Payment, Needs Verification, In Production, Shipped, Completed.
- [ ] Filters: date, courier, product type, keyword (order number, name, phone).
- [ ] Order detail includes a **Download print file** button producing the production PDF from the snapshot with crop marks and bleed enabled.
- [ ] Status changes record timestamp and actor; every change written to `audit_logs`.
- [ ] Tracking number and courier entry; saving triggers the customer email.
- [ ] Simple printable shipping label (recipient, sender, order number, weight).
- [ ] CSV export of orders by date range for bookkeeping.

### P2-US-1102 · Rate and zone management
- [ ] CRUD for `shipping_rates` and `region_zones`.
- [ ] CSV import for bulk rate updates.
- [ ] Origin address and per-product packaging weight configurable.

### P2-US-1103 · Notifications
- [ ] Transactional emails: order created, payment received, order shipped (with tracking), order completed.
- [ ] Email templates use the site name and brand colors from `settings`.
- [ ] For WhatsApp, Phase 2 provides **copy-ready message buttons** in the admin panel (e.g. "Hi {name}, order {number} has shipped via {courier}, tracking {tracking}"). Automation lands in Phase 4.

---

## Phase 2 Risk Register

| Risk | Mitigation |
|---|---|
| Underpriced shipping erodes margin | Manual rate table with a buffer; cap maximum order weight; disclose that admin may confirm shipping for large parcels |
| User edits the design after paying and assumes that version ships | Snapshot freeze, pre-checkout warning, and a UI that separates "the file we printed" from "your current design" |
| Forged payment proof | Unique-code amounts, manual verification, audit trail. Never auto-approve |
| Inconsistent vendor print quality | Keep an approved test print as reference; send a spec sheet alongside every production file |
| Orders stalling in one status | Daily admin digest for orders idle more than two working days |

## Out of Scope for Phase 2

Automated payment gateway, courier API integration, the custom editor, coupons, automated returns and refunds, multiple print vendors.
