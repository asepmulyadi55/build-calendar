/**
 * Seeds reference data. Idempotent — safe to re-run.
 *
 * Nothing seeded here is authoritative in code. Every row is admin-editable
 * (P1-US-703); these are starting values, not constants.
 */
import { PrismaClient, type UserRole } from '@prisma/client';

const prisma = new PrismaClient();

// ── Coin packages (BR-C01) ─────────────────────────────────────────────────────
const COIN_PACKAGES = [
  { name: 'Starter', priceIdr: 10_000, coinAmount: 5, sortOrder: 1, badge: null },
  { name: 'Popular', priceIdr: 25_000, coinAmount: 15, sortOrder: 2, badge: 'Best value' },
  { name: 'Studio', priceIdr: 50_000, coinAmount: 35, sortOrder: 3, badge: null },
];

// ── Product presets (master spec §6) ───────────────────────────────────────────
// unlock_cost_coins is 1 everywhere per BR-C04. weight_gram_per_sheet and
// print_base_price stay 0 until the owner weighs and prices real stock — they are
// only used by Phase 2 print orders.
const PRODUCT_PRESETS = [
  {
    code: 'DESK-A5L',
    name: 'Desk calendar',
    widthMm: 210,
    heightMm: 148,
    orientation: 'landscape',
    sheetCount: 13,
    monthsPerSheet: 1,
    hasCover: true,
    bleedMm: 3,
    safeMarginMm: 7,
    unlockCostCoins: 1,
  },
  {
    code: 'DESK-SQ',
    name: 'Square desk calendar',
    widthMm: 150,
    heightMm: 150,
    orientation: 'square',
    sheetCount: 13,
    monthsPerSheet: 1,
    hasCover: true,
    bleedMm: 3,
    safeMarginMm: 7,
    unlockCostCoins: 1,
  },
  {
    code: 'WALL-12',
    name: 'Wall calendar, 12 sheets',
    widthMm: 297,
    heightMm: 420,
    orientation: 'portrait',
    sheetCount: 12,
    monthsPerSheet: 1,
    hasCover: false,
    bleedMm: 3,
    safeMarginMm: 10,
    unlockCostCoins: 1,
  },
  {
    code: 'WALL-6',
    name: 'Wall calendar, 6 sheets',
    widthMm: 320,
    heightMm: 480,
    orientation: 'portrait',
    sheetCount: 6,
    monthsPerSheet: 2,
    hasCover: false,
    bleedMm: 3,
    safeMarginMm: 10,
    unlockCostCoins: 1,
  },
  {
    code: 'WALL-1',
    name: 'Wall calendar, single sheet',
    widthMm: 420,
    heightMm: 594,
    orientation: 'portrait',
    sheetCount: 1,
    monthsPerSheet: 12,
    hasCover: false,
    bleedMm: 3,
    safeMarginMm: 12,
    unlockCostCoins: 1,
  },
];

// ── Holidays ───────────────────────────────────────────────────────────────────
// Only the fixed-date national holidays are seeded. Names are the official
// Indonesian ones, verbatim (master §6.2, §10.7).
//
// Every other Indonesian public holiday — Imlek, Nyepi, Idul Fitri, Waisak,
// Isra Mikraj, Kenaikan Isa Almasih, Idul Adha, Tahun Baru Islam, Maulid Nabi —
// and all *cuti bersama* move each year and are fixed by an SKB decree published
// late in the preceding year. Guessing them would put wrong red dates on a printed
// calendar, so they are imported per year through the admin panel (P1-US-703).
const FIXED_HOLIDAYS = [
  { monthDay: '01-01', name: 'Tahun Baru Masehi' },
  { monthDay: '05-01', name: 'Hari Buruh Internasional' },
  { monthDay: '06-01', name: 'Hari Lahir Pancasila' },
  { monthDay: '08-17', name: 'Hari Kemerdekaan Republik Indonesia' },
  { monthDay: '12-25', name: 'Hari Raya Natal' },
];

// ── Templates ──────────────────────────────────────────────────────────────────
// Seeded inactive on purpose. A template is a Design JSON in R2 (AR-02), and neither
// `calendar-core` nor the R2 objects exist yet. The admin activates them once the
// real design is uploaded (P1-US-702). Three, not six — see ADR-0007.
const TEMPLATES = [
  {
    name: 'Kayu',
    slug: 'kayu',
    presetCode: 'WALL-12',
    category: 'minimal',
    photoSlots: 12,
  },
  {
    name: 'Pesisir',
    slug: 'pesisir',
    presetCode: 'DESK-A5L',
    category: 'photo',
    photoSlots: 13,
  },
  {
    name: 'Batik Modern',
    slug: 'batik-modern',
    presetCode: 'WALL-1',
    category: 'pattern',
    photoSlots: 1,
  },
];

// ── Settings ───────────────────────────────────────────────────────────────────
// Placeholders. The owner fills these in through the admin panel before launch.
const SETTINGS: Record<string, unknown> = {
  site_name: process.env.SITE_NAME ?? 'BuildCalendar',
  contact_email: '',
  whatsapp_number: '',
  bank_accounts: [],
  qris_image_key: null,
};

async function seedCoinPackages() {
  for (const pkg of COIN_PACKAGES) {
    const existing = await prisma.coinPackage.findFirst({ where: { name: pkg.name } });
    if (existing) {
      await prisma.coinPackage.update({ where: { id: existing.id }, data: pkg });
    } else {
      await prisma.coinPackage.create({ data: pkg });
    }
  }
  console.log(`  coin_packages    ${COIN_PACKAGES.length}`);
}

async function seedProductPresets() {
  for (const preset of PRODUCT_PRESETS) {
    await prisma.productPreset.upsert({
      where: { code: preset.code },
      create: preset,
      update: preset,
    });
  }
  console.log(`  product_presets  ${PRODUCT_PRESETS.length}`);
}

async function seedHolidays() {
  const thisYear = new Date().getUTCFullYear();
  const years = [thisYear, thisYear + 1];
  let count = 0;

  for (const year of years) {
    for (const holiday of FIXED_HOLIDAYS) {
      const date = new Date(`${year}-${holiday.monthDay}T00:00:00.000Z`);
      const data = {
        date,
        name: holiday.name,
        type: 'national' as const,
        year,
        isRedDate: true,
        source: 'seed:fixed-date',
      };
      await prisma.holiday.upsert({
        where: { date_name: { date, name: holiday.name } },
        create: data,
        update: data,
      });
      count++;
    }
  }
  console.log(`  holidays         ${count} (${years.join(', ')}, fixed-date only)`);
}

async function seedTemplates() {
  for (const [index, template] of TEMPLATES.entries()) {
    const preset = await prisma.productPreset.findUnique({ where: { code: template.presetCode } });
    if (!preset) throw new Error(`missing product preset ${template.presetCode}`);

    const slotSchema = {
      slots: Array.from({ length: template.photoSlots }, (_, i) => ({
        id: `photo-${i + 1}`,
        type: 'image',
        required: true,
      })),
    };

    const data = {
      name: template.name,
      productPresetId: preset.id,
      category: template.category,
      thumbnailKey: `templates/${template.slug}/thumbnail.jpg`,
      designKey: `templates/${template.slug}/design.json`,
      slotSchema,
      isPremium: false,
      isActive: false,
      sortOrder: index + 1,
    };

    await prisma.template.upsert({
      where: { slug: template.slug },
      create: { slug: template.slug, ...data },
      update: data,
    });
  }
  console.log(`  templates        ${TEMPLATES.length} (inactive until Design JSON exists)`);
}

async function seedSettings() {
  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, valueJson: value as never },
      update: {},
    });
  }
  console.log(`  settings         ${Object.keys(SETTINGS).length}`);
}

/**
 * Creates the admin through the Supabase Auth Admin API, because `auth.users` is
 * owned by Supabase and Prisma must not write to it (§5.4). Skipped when the
 * credentials are absent, so the seed still works against a bare database.
 */
async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!email || !password || !supabaseUrl || !serviceKey) {
    console.log('  admin            skipped (SEED_ADMIN_EMAIL / _PASSWORD not set)');
    return;
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  let userId: string | undefined;

  const created = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });

  if (created.ok) {
    userId = ((await created.json()) as { id: string }).id;
  } else {
    // Already registered — find the existing user instead of failing the seed.
    for (let page = 1; page <= 10 && !userId; page++) {
      const list = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=200`, {
        headers,
      });
      if (!list.ok) break;
      const body = (await list.json()) as { users?: { id: string; email?: string }[] };
      if (!body.users?.length) break;
      userId = body.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
    }
  }

  if (!userId) {
    console.warn(`  admin            FAILED (${created.status} ${await created.text()})`);
    return;
  }

  await prisma.profile.upsert({
    where: { id: userId },
    create: { id: userId, name: 'Admin', role: 'admin' as UserRole },
    update: { role: 'admin' as UserRole },
  });
  console.log(`  admin            ${email}`);
}

async function main() {
  console.log('Seeding BuildCalendar reference data…');
  await seedCoinPackages();
  await seedProductPresets();
  await seedHolidays();
  await seedTemplates();
  await seedSettings();
  await seedAdmin();
  console.log('Done.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
