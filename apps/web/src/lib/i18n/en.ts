/**
 * Every application string lives here (P1-US-003). No string is written inline
 * in a component, a route handler, or an error message.
 *
 * This file is English and stays English — it is the interface.
 *
 * Calendar output strings (month names, weekday labels, holiday names) do NOT
 * belong here. They are Indonesian and live in `calendar-core`. Keeping the two
 * apart is what stops the English interface leaking onto a printed sheet
 * (master spec §10.7).
 */
export const en = {
  app: {
    name: 'BuildCalendar',
    tagline: 'Print-ready calendars from your own photos.',
  },
  skeleton: {
    heading: 'Repository skeleton',
    body: 'The build is running. No product features are implemented yet — this page exists to prove the app boots, the design tokens load, and the health check answers.',
    healthLink: 'Health check',
  },
  health: {
    ok: 'ok',
    degraded: 'degraded',
    databaseUnreachable: 'Database unreachable.',
  },
} as const;

export type Messages = typeof en;
