/**
 * Every application string lives here (P1-US-003). No string is written inline in
 * a component, a route handler, or an error message.
 *
 * This file is English and stays English — it is the interface.
 *
 * Calendar output strings (month names, weekday labels, holiday names) do NOT
 * belong here. They are Indonesian and live in `calendar-core`. Keeping the two
 * apart is what stops the English interface leaking onto a printed sheet
 * (master spec §10.7).
 *
 * No price, coin amount, or phone number appears here either. Those come from
 * `coin_packages`, `product_presets` and `settings` (BR-C01, BR-C04). Where the
 * prototype's copy contains a figure, the wording is kept and the number becomes a
 * `{slot}` filled at render time.
 *
 * Copy is written for readers whose first language is not English: short
 * sentences, concrete words, no idioms.
 */
export const en = {
  app: {
    name: 'BuildCalendar',
    nameLead: 'Build',
    nameTail: 'Calendar',
    tagline:
      'Print-ready calendars from your own photos, with Indonesian holidays already filled in.',
    description:
      'Pick a design, drop in your photos, and see the result before you pay. Download a print-ready 300 dpi PDF, or let us print it and ship it to your door.',
  },

  nav: {
    calendarTypes: 'Calendar types',
    samples: 'Samples',
    howItWorks: 'How it works',
    pricing: 'Pricing',
    faq: 'FAQ',
    signIn: 'Sign in',
    makeCalendar: 'Make a calendar',
    menu: 'Menu',
    skipToContent: 'Skip to content',
  },

  home: {
    hero: {
      eyebrow: 'Print-ready PDF at 300 dpi · Indonesian holidays built in',
      headingLine1: 'Your photos,',
      headingLine2: 'a whole year',
      headingEmphasis: 'on the wall',
      lede: 'Pick a design, drop in your photos, and see the result before you pay a thing. Download the print-ready file yourself, or let us print it and ship it to your door.',
      primaryCta: 'Make a calendar',
      secondaryCta: 'See samples',
      promiseLead: 'Pay once per calendar.',
      promiseRest:
        ' After that, revise it and download it again as often as you like — forever, with no extra coins.',
      mockupSlotLabel: 'PHOTO SLOT',
      mockupSlotTitle: 'Your photo goes here',
      mockupSheetLabel: 'sheet 01/12',
      mockupSpec: 'A3 · 297 × 420 MM · BLEED 3 MM · KALENDER INDONESIA',
    },

    types: {
      /**
       * The count is filled from `product_presets` rather than written down. The
       * prototype said "Four formats" and the seed ships five; an admin adding a
       * sixth must not make the page lie.
       */
      eyebrow: '{count} formats',
      heading: 'One for your desk, the rest for your wall.',
      lede: 'Every size follows standard print dimensions, with bleed and crop marks included. Send the file to any print shop and it will just work.',
      link: 'See them printed →',
      sheetsSuffix: 'sheets',
      sheetSuffixSingular: 'sheet',
      cardSamplesLink: 'See samples →',
      cardMakeLink: 'Make this one',
    },

    how: {
      eyebrow: 'Three steps',
      heading: 'From the photos on your phone to a calendar on the wall.',
      link: 'Start now →',
      steps: [
        {
          number: '01',
          title: 'Pick a design',
          body: 'Start from a ready-made design and change the colours to taste. Red dates and holiday names are already filled in for you.',
        },
        {
          number: '02',
          title: 'Add your photos',
          body: "Upload, reposition, and see the result immediately. We'll warn you if a photo is too small and will look pixelated in print.",
        },
        {
          number: '03',
          title: 'Download or order a print',
          body: 'Take the print-ready PDF and use any print shop, or have us print it and ship it to your address.',
        },
      ],
    },

    samples: {
      eyebrow: 'Sample designs',
      heading: 'Designs you can use as they are.',
      lede: 'Every design lets you swap the photos, change the colours, and edit the text. Shown as printed output, not as screenshots.',
      link: 'Browse all designs →',
    },

    /**
     * The coin explainer. This is the product's main differentiator and the most
     * common source of confusion, so the wording is the prototype's, unchanged.
     * `{perCalendar}` is the only substitution and it is derived from the cheapest
     * active coin package — it must never become a literal.
     */
    coins: {
      eyebrow: 'How coins work',
      headingLead: 'One coin opens one calendar. After that, it’s ',
      headingEmphasis: 'free forever',
      headingTail: '.',
      steps: [
        {
          kicker: 'Once',
          title: 'Open it with 1 coin',
          body: 'The coin opens a calendar — not a single download. That works out to about {perCalendar}.',
        },
        {
          kicker: 'Unlimited',
          title: 'Revise as much as you want',
          body: 'Swap photos, fix the text, adjust colours. However many times you do it, no coin is ever deducted again.',
        },
        {
          kicker: 'Forever',
          title: 'Download it again any time',
          body: 'Your files stay in your account. Lost the file? Need it again next year? Still free.',
        },
      ],
    },

    pricing: {
      eyebrow: 'Pricing',
      heading: 'Top up once, use them whenever.',
      lede: "Coins never expire. Physical printing is priced separately and doesn't use coins at all.",
      link: 'Full pricing →',
    },

    /**
     * P1-US-101 requires at least eight, covering: do coins expire, can I revise,
     * what file format, where can I print it, can you print for me, shipping, is my
     * photo safe, how do I pay. The first six are the prototype's, word for word.
     * The last three cover topics the story lists that the prototype did not have.
     */
    faq: {
      eyebrow: 'Questions',
      heading: 'The things people ask most.',
      link: 'Ask us on WhatsApp →',
      items: [
        {
          question: 'If I mess up the design, do I lose my coin?',
          answer:
            "No. A coin opens one calendar — it isn't charged per download. Once it's open, you can swap photos, fix the text, and download it again as many times as you want, without spending anything more.",
        },
        {
          question: 'Where can I get it printed?',
          answer:
            "Anywhere. The file is a 300 dpi PDF with 3 mm bleed and crop marks, at exactly the right trim size. If you'd rather not deal with it, you can order the print directly from us.",
        },
        {
          question: 'What file do I actually get?',
          answer:
            'One PDF containing every sheet in order, at the exact trim size plus 3 mm bleed on all four sides. Text stays vector, photos sit at 300 dpi, and the fonts are embedded, so nothing shifts when a print shop opens it.',
        },
        {
          question: 'Are Indonesian holidays already marked?',
          answer:
            'Yes. National holidays and joint leave days are marked in red with their names printed alongside, in Indonesian. We update the data whenever the government announces the official schedule.',
        },
        {
          question: 'Are my family photos safe?',
          answer:
            'Your photos are only ever used for your own calendar. We strip the location data embedded in image files, and we never use your photos as samples without your written permission.',
        },
        {
          question: 'How do I pay?',
          answer:
            "Bank transfer or QRIS. Upload your payment proof and the coins land once we've verified it — usually within a few hours during working hours.",
        },
        {
          question: 'Do coins expire?',
          answer:
            "Never. Coins you've bought stay in your account and work whenever you need them, including next year. Do note that purchased coins can't be converted back to cash.",
        },
        {
          question: 'Can you print it for me?',
          answer:
            'Yes. Message us on WhatsApp with your finished calendar and we will quote the printing by hand. Printing is priced separately and never uses coins.',
        },
        {
          question: 'How does shipping work?',
          answer:
            'For now, we agree the courier and the cost with you over WhatsApp before anything is printed, and send the tracking number once it ships. Automatic shipping rates at checkout come later.',
        },
      ],
    },

    final: {
      heading: 'Make one. See it first.',
      lede: 'The preview is free. Pay only if you like what you see.',
      cta: 'Make a calendar',
    },
  },

  pricingPage: {
    eyebrow: 'Pricing',
    title: 'Two ways to pay. Neither is a subscription.',
    lede: 'Coins unlock the digital file. Printing is a separate, one-off purchase. You never need both.',

    coins: {
      eyebrow: 'Option one — do it yourself',
      heading: 'Coins unlock the file.',
      link: 'How coins work →',
      asideKicker: 'Good to know',
      asideTitle: 'One coin, one calendar',
      asideBody:
        'The coin opens a calendar permanently. Revising it and downloading it again costs nothing, now or in five years.',
      asideCta: 'Read the details',
    },

    /** P1-US-102 requires this list explicitly. */
    benefits: [
      { lead: '300 dpi PDF, no watermark', rest: ', with bleed and crop marks' },
      { lead: 'Free revisions and re-downloads', rest: ', forever' },
      { lead: 'Indonesian holidays filled in', rest: ', names included' },
      { lead: 'Coins never expire', rest: ', no monthly fee' },
      { lead: 'Files stored in your account', rest: ', downloadable any time' },
      { lead: 'Free preview', rest: ' before you pay anything' },
      { lead: 'Bank transfer or QRIS', rest: ', verified within hours' },
    ],

    print: {
      eyebrow: 'Option two — we print it',
      heading: 'Printed, bound, and delivered.',
      lede: 'Ordering a print does not use coins. The price below includes production; shipping is calculated at checkout from your address.',
      tableHeaders: {
        format: 'Format',
        size: 'Size',
        sheets: 'Sheets',
        from: 'From',
      },
      note: 'Indicative pricing. Paper, finishing and quantity options are set by an admin, and every order is priced by the server at checkout.',
      phaseBadge: 'Segera hadir',
      phaseNote:
        'Print ordering, shipping rates and courier tracking arrive later. Until then, the WhatsApp button reaches us directly for print requests.',
    },

    miniFaq: {
      heading: 'Two quick answers',
      items: [
        {
          question: 'Do coins expire?',
          answer:
            'No. Coins you have bought stay in your account and work whenever you need them, including next year.',
        },
        {
          question: 'What if I mess up the design?',
          answer:
            'Edit it and export again. Once a calendar is open, revisions and downloads are free, however many times you need them.',
        },
      ],
    },
  },

  samplesPage: {
    eyebrow: 'Sample designs',
    title: 'Every design, shown as it prints.',
    lede: 'Swap the photos, change the colours, edit the text. The layout, the holiday grid and the print spec stay exactly as you see them here.',
    filterAll: 'All',
    filterLabel: 'Filter designs by category',
    emptyHeading: 'No designs in this category yet',
    emptyBody: 'Try another category, or browse them all.',
    ctaHeading: 'Nothing quite right?',
    ctaBody: 'Build one from scratch with the custom editor — arriving in a later release.',
    ctaButton: 'Start from a design',
    lightbox: {
      open: 'View {name} larger',
      close: 'Close',
      previous: 'Previous design',
      next: 'Next design',
      useThis: 'Use this design',
    },
  },

  /**
   * Descriptive copy per product, keyed by `product_presets.code`.
   *
   * The dimensions, sheet counts and prices are NOT here — those come from the
   * database. Only the sentence a marketer would write does. A preset with no entry
   * renders without a description rather than blocking the page, so an admin adding
   * a product never breaks the homepage.
   */
  products: {
    'DESK-A5L': {
      description:
        'Stands on a desk, one sheet per month. The one people pick most often as a gift.',
      paperName: null,
      extra: 'spiral',
    },
    'DESK-SQ': {
      description: 'Square, and small enough for a crowded desk. One sheet per month.',
      paperName: null,
      extra: 'spiral',
    },
    'WALL-12': {
      description: 'One month per sheet. Big photo, and room to write on every single date.',
      paperName: 'A3',
      extra: null,
    },
    'WALL-6': {
      description: 'Two months per sheet. Cheaper to print, still a photo on every sheet.',
      paperName: null,
      extra: null,
    },
    'WALL-1': {
      description: 'All twelve months on one page. The office and shopfront favourite.',
      paperName: 'A2',
      extra: null,
    },
  } as Record<string, { description: string; paperName: string | null; extra: string | null }>,

  /** Shared by the homepage pricing section and the pricing page. */
  pricing: {
    choose: 'Choose',
    coinUnit: 'coin',
    coinsUnit: 'coins',
    perCalendar: 'per calendar',
    unavailable: 'Coin packages are being updated. Please check back shortly.',
  },

  whatsapp: {
    label: 'Chat with us',
    ariaLabel: 'Message us on WhatsApp',
    defaultMessage: 'Hi, I have a question about BuildCalendar',
    productMessage: 'Hi, I have a question about {product}',
    pricingMessage: 'Hi, I have a question about coins and pricing',
    samplesMessage: 'Hi, I have a question about the sample designs',
    printMessage: 'Hi, I would like to ask about printing a calendar',
  },

  footer: {
    product: 'Product',
    help: 'Help',
    legal: 'Legal',
    links: {
      calendarTypes: 'Calendar types',
      sampleDesigns: 'Sample designs',
      pricing: 'Pricing',
      makeCalendar: 'Make a calendar',
      howItWorks: 'How it works',
      faq: 'FAQ',
      orderPrint: 'Order a print',
      contact: 'Contact us',
      terms: 'Terms of service',
      privacy: 'Privacy policy',
      refunds: 'Refund policy',
    },
    copyright: '© {year} BUILDCALENDAR',
  },

  legal: {
    termsTitle: 'Terms of service',
    privacyTitle: 'Privacy policy',
    refundsTitle: 'Refund policy',
    faqTitle: 'Frequently asked questions',
    howItWorksTitle: 'How it works',
    lastUpdated: 'Last updated {date}',
  },

  /**
   * Accounts (Epic 2).
   *
   * Every error message here is deliberately vague about whether an address is
   * registered. Wrong password and unknown email share one string, and a repeat
   * signup gets the same "check your email" as a new one. See `auth/errors.ts` —
   * splitting them apart would be user enumeration on accounts that hold money.
   */
  auth: {
    signIn: {
      eyebrow: 'Welcome back',
      title: 'Sign in to your calendars.',
      email: 'Email',
      emailPlaceholder: 'you@example.com',
      password: 'Password',
      passwordPlaceholder: '••••••••',
      forgotPassword: 'Forgot your password?',
      rememberMe: 'Keep me signed in for 30 days',
      submit: 'Sign in',
      submitting: 'Signing in…',
      or: 'or',
      google: 'Continue with Google',
      noAccount: 'New here?',
      createAccount: 'Create an account',
    },

    signUp: {
      eyebrow: 'Free to start',
      title: 'Make your first calendar.',
      name: 'Name',
      namePlaceholder: 'Your name',
      email: 'Email',
      emailPlaceholder: 'you@example.com',
      whatsapp: 'WhatsApp number',
      whatsappOptional: '(optional)',
      whatsappPlaceholder: '+62…',
      whatsappHint: 'Used only for order updates. Never for marketing.',
      password: 'Password',
      passwordPlaceholder: 'At least 8 characters',
      termsLead: 'I agree to the ',
      termsLink: 'Terms',
      termsMiddle: ' and ',
      privacyLink: 'Privacy Policy',
      termsTail: ', and I understand that coins are non-refundable.',
      submit: 'Create account',
      submitting: 'Creating your account…',
      or: 'or',
      google: 'Continue with Google',
      haveAccount: 'Already have an account?',
      signInLink: 'Sign in',
      /** Identical whether or not the address was already registered. */
      checkYourEmail:
        'Check your email. If we can create an account for that address, a verification link is on its way.',
    },

    password: {
      /** Indexed by strength score, 0 to 4. */
      strength: ['Too short', 'Weak', 'Fair', 'Good', 'Strong'],
      strengthLabel: 'Password strength',
      show: 'Show password',
      hide: 'Hide password',
    },

    forgot: {
      eyebrow: 'Password reset',
      title: 'We will send you a link.',
      lede: 'Enter the email you signed up with. The link works once and expires after an hour.',
      submit: 'Send reset link',
      submitting: 'Sending…',
      backToSignIn: 'Back to sign in',
      /** Identical whether or not the address exists. */
      sent: 'Check your email. If that address has an account, a reset link is on its way.',
    },

    reset: {
      eyebrow: 'Password reset',
      title: 'Choose a new password.',
      newPassword: 'New password',
      confirmPassword: 'Confirm new password',
      submit: 'Save new password',
      submitting: 'Saving…',
      done: 'Your password has been changed. You are signed in.',
      linkInvalid:
        'That reset link is no longer valid. Reset links work once and expire after an hour.',
      requestAnother: 'Request another link',
    },

    verify: {
      eyebrow: 'One more step',
      title: 'Verify your email.',
      lede: 'We sent a link to your inbox. You can browse and build a calendar now, but topping up and unlocking need a verified address.',
      resend: 'Send the link again',
      resending: 'Sending…',
      resent: 'Sent. Check your inbox, and your spam folder.',
      backToApp: 'Keep looking around',
      bannerText: 'Verify your email to top up and unlock calendars.',
      bannerAction: 'Resend link',
    },

    account: {
      eyebrow: 'Account',
      title: 'Your account',
      profileHeading: 'Profile',
      profileLede: 'Your name and WhatsApp number. Both are used only for order updates.',
      name: 'Name',
      whatsapp: 'WhatsApp number',
      whatsappOptional: '(optional)',
      email: 'Email',
      emailLocked: 'Email cannot be changed yet. Contact us if you need to move your account.',
      saveProfile: 'Save changes',
      profileSaved: 'Saved.',

      passwordHeading: 'Password',
      passwordLede: 'Changing your password signs out your other devices.',
      currentPassword: 'Current password',
      newPassword: 'New password',
      savePassword: 'Change password',
      passwordSaved: 'Your password has been changed.',

      dangerHeading: 'Delete account',
      dangerLede:
        'Your calendars, photos and exported files are removed within 7 days. Payment records are kept in anonymised form because they are financial records. This cannot be undone.',
      dangerConfirmLabel: 'Type your email address to confirm',
      dangerConfirmMismatch: 'That does not match the email on this account.',
      dangerSubmit: 'Delete my account',
      dangerSubmitting: 'Deleting…',
      dangerDone: 'Your account is scheduled for deletion. You have been signed out.',

      signOut: 'Sign out',
      verified: 'Verified',
      unverified: 'Not verified',
    },

    errors: {
      /** One string for wrong password AND unknown address. Do not split. */
      invalidCredentials: 'That email and password do not match. Check both and try again.',
      emailNotConfirmed: 'Please verify your email address first. Check your inbox for the link.',
      tooManyAttempts: 'Too many attempts. Please wait a few minutes and try again.',
      rateLimited: 'Too many attempts from this connection. Please wait {seconds} seconds.',
      linkExpired: 'That link is no longer valid. Links work once and expire after an hour.',
      samePassword: 'That is the same as your current password. Choose a different one.',
      generic: 'Something went wrong. Please try again, or contact us on WhatsApp.',
      nameRequired: 'Please enter your name.',
      emailInvalid: 'Please enter a valid email address.',
      passwordRequired: 'Please enter a password.',
      passwordWhitespaceOnly: 'A password cannot be only spaces.',
      passwordTooShort: 'Use at least 8 characters.',
      passwordTooLong: 'That password is too long. Use 72 characters or fewer.',
      passwordMismatch: 'The two passwords do not match.',
      termsRequired: 'Please accept the Terms and Privacy Policy to continue.',
      whatsappInvalid: 'That does not look like an Indonesian phone number.',
      accountDeleted: 'This account has been closed. Contact us on WhatsApp if that is a mistake.',
      signInRequired: 'Please sign in to continue.',
      verificationRequired: 'Please verify your email address before doing that.',
    },
  },

  /**
   * Admin panel (Epic 7). English like the rest of the interface.
   *
   * `templateValidation` maps the issue codes `calendar-core` returns onto
   * sentences. The validator stays free of interface copy so it can be reused by
   * the renderer, and every message a human reads still lives in this one file.
   */
  admin: {
    badge: 'ADMIN',
    userView: 'User view',
    nav: {
      payments: 'Payments',
      templates: 'Templates',
      holidays: 'Holidays',
      users: 'Users',
      settings: 'Settings',
    },

    templates: {
      eyebrow: 'Template library',
      title: 'Templates',
      lede: 'Templates are authored as files and imported here. A template stays inactive until you have previewed it.',
      importCta: 'Import a template',
      empty: 'No templates yet. Import one to get started.',
      docsLink: 'Read the file format',

      table: {
        name: 'Name',
        preset: 'Format',
        category: 'Category',
        slots: 'Slots',
        status: 'Status',
        order: 'Order',
        actions: 'Actions',
      },

      status: { active: 'Active', inactive: 'Inactive' },
      view: 'Open',

      importTitle: 'Import a template',
      importLede:
        'Paste the Design JSON or upload the file. It is checked against the product preset before anything is stored.',
      fieldName: 'Name',
      fieldSlug: 'Slug',
      fieldSlugHint:
        'Used in the storage path and the public URL. Lowercase letters, numbers and hyphens.',
      fieldCategory: 'Category',
      fieldPreset: 'Product preset',
      fieldSortOrder: 'Sort order',
      fieldPremium: 'Premium template',
      fieldThumbnail: 'Thumbnail',
      fieldThumbnailHint: 'JPEG, PNG or WebP, up to 2 MB. Shown in the gallery.',
      fieldDesignFile: 'Design JSON file',
      fieldDesignPaste: 'or paste the Design JSON',
      submitImport: 'Validate and import',
      submitting: 'Importing…',

      detailEyebrow: 'Template',
      slotSchemaHeading: 'Slot schema',
      slotSchemaLede: 'Derived from the design. This is what the editor asks the user to fill.',
      previewHeading: 'Preview',
      previewLede:
        'Sheet outlines with every slot placed to scale, in millimetres. Check this before activating.',
      previewSheet: 'Sheet {index}',
      previewNoThumbnail: 'No thumbnail uploaded.',

      activate: 'Activate',
      deactivate: 'Deactivate',
      activateHint:
        'An active template appears in the gallery and can be used to start a calendar.',
      delete: 'Delete template',
      deleteConfirmLabel: 'Type the slug to confirm',
      deleteConfirmMismatch: "That does not match this template's slug.",
      deleteHint:
        'Removes the row and its files. A calendar already built from it is unaffected — the design was copied at the time.',

      saveChanges: 'Save changes',
      saved: 'Saved.',
      imported: 'Template imported. Preview it, then activate.',
      activated: 'Template activated. It now appears in the gallery.',
      deactivated: 'Template deactivated.',
      deleted: 'Template deleted.',

      errors: {
        nameRequired: 'Give the template a name.',
        slugInvalid: 'Use lowercase letters, numbers and hyphens only.',
        slugTaken: 'A template with that slug already exists.',
        presetRequired: 'Choose a product preset.',
        categoryRequired: 'Give the template a category.',
        designRequired: 'Upload or paste the Design JSON.',
        designNotJson:
          'That file is not valid JSON. Check for a trailing comma or a missing brace.',
        thumbnailTooLarge: 'That image is larger than 2 MB.',
        thumbnailWrongType: 'Thumbnails must be JPEG, PNG or WebP.',
        storageNotConfigured:
          'Object storage is not configured. Set the R2 variables before importing a template.',
        notFound: 'That template no longer exists.',
        validationFailed: 'The design was rejected. Nothing was stored.',
      },
    },

    /** One sentence per issue code returned by `validateCalendarDesign`. */
    templateValidation: {
      heading: 'This design cannot be imported',
      lede: 'Every problem found is listed. Nothing was stored.',
      atPath: 'at {path}',
      notAnObject: 'The file is not a Design JSON object.',
      unsupportedSchemaVersion:
        'Unsupported schemaVersion {version}. This build understands version {supported}.',
      missingField: 'A required field is missing.',
      invalidField: 'This field has the wrong type or an impossible value.',
      presetCodeMismatch:
        'The design says it is for {actual}, but it is being imported as {expected}.',
      sheetCountMismatch: 'This preset needs {expected} sheets, and the design has {actual}.',
      sheetSizeMismatch:
        'Sheet trim size is {actualWidthMm} × {actualHeightMm} mm, but the preset is {expectedWidthMm} × {expectedHeightMm} mm.',
      duplicateSlotId:
        'Slot id "{slotId}" is used more than once. Ids address a user photo, so duplicates overwrite each other.',
      emptySlotId: 'A slot has no id.',
      noSlots: 'The design has no slots, so there is nothing for a user to fill.',
      unknownFont:
        '"{fontFamily}" is not in the renderer image. It would silently fall back and the PDF would not match the preview.',
      invalidMonth: 'A calendar grid has month {month}, which is not between 1 and 12.',
      invalidLocale: 'A calendar grid must render {expected}. The printed sheet is Indonesian.',
    },
  },

  /** Building a calendar (Epic 3). */
  newProject: {
    crumbStep1: 'New calendar · Step 1 of 2',
    crumbStep2: 'Step 2 of 2',
    titleFormat: 'Choose a format',
    titleDesign: 'Pick a design',
    cancel: 'Cancel',
    year: 'Year',
    selected: 'selected',
    sheetsSuffix: 'sheets',
    sheetSuffixSingular: 'sheet',

    fromScratch: 'Start from scratch',
    fromScratchBadge: 'Coming soon',
    fromScratchHint: 'Designing a calendar from a blank sheet arrives in a later release.',

    filterAll: 'All',
    filterLabel: 'Filter designs by category',
    use: 'USE →',
    quickLook: 'Quick look',
    premium: 'Premium',

    noPresets: 'No calendar formats are available right now. Please try again shortly.',
    noTemplates:
      'No designs are ready for this format yet. Try another format, or ask us on WhatsApp.',
    chooseFormatFirst: 'Choose a format above to see the designs that fit it.',

    modal: {
      close: 'Close',
      sheets: 'Every sheet in this design',
      sheetLabel: 'Sheet {index}',
      useThis: 'Use this design',
      slots: '{count} photos to fill',
      slot: '1 photo to fill',
    },

    creating: 'Creating your calendar…',
    createCta: 'Use this design',

    errors: {
      signInRequired: 'Please sign in to start a calendar.',
      templateNotFound: 'That design is no longer available.',
      templateInactive: 'That design is not available yet.',
      designUnavailable:
        'That design could not be loaded. Please try another one, or tell us on WhatsApp.',
      yearInvalid: 'Choose a year between {min} and {max}.',
      createFailed: 'Your calendar could not be created. Please try again.',
    },
  },

  /**
   * The landing page after a project is created. The editor itself is a later
   * story; this page exists so the flow does not dead-end.
   */
  projectEditor: {
    heading: 'Your calendar is ready to edit',
    body: 'The design has been copied into your calendar, so later changes to the template will not affect it. The editor arrives in the next release.',
    sheets: 'Sheets',
    year: 'Year',
    copiedFrom: 'Copied from',
    templateRemoved: 'a template that has since been removed',
    designBytes: 'Design size (bytes)',
    back: 'Start another calendar',
  },

  appShell: {
    projects: 'Projects',
    newCalendar: 'New calendar',
    coins: 'Coins & billing',
    orders: 'Orders',
    settings: 'Settings',
    comingSoon: 'Coming soon',
    balance: 'BALANCE',
    coinsUnit: 'coins',
    topUp: 'Top up',
    adminView: 'Admin view →',
  },

  health: {
    ok: 'ok',
    degraded: 'degraded',
    databaseUnreachable: 'Database unreachable.',
  },

  errors: {
    settingsUnavailable: 'Site settings could not be loaded.',
  },
} as const;

export type Messages = typeof en;

/** Fills `{slot}` placeholders. Keeps copy in one file while numbers stay dynamic. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
