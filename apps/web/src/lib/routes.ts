/**
 * Every internal path in one place.
 *
 * Routes that Phase 1 has not built yet still appear here — the navigation links to
 * them from day one, and a typo in a href is not something a type checker catches.
 */
export const routes = {
  home: '/',
  calendarTypes: '/#types',
  samples: '/samples',
  howItWorks: '/how-it-works',
  pricing: '/pricing',
  faq: '/faq',
  terms: '/terms',
  privacy: '/privacy',
  refunds: '/refunds',

  signIn: '/signin',
  signUp: '/signup',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',
  account: '/account',

  adminTemplates: '/admin/templates',
  adminTemplateNew: '/admin/templates/new',

  /** Built in later epics; linked from the marketing pages already. */
  newProject: '/projects/new',
  coins: '/coins',
} as const;

export type Route = (typeof routes)[keyof typeof routes];
