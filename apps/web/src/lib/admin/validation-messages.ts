import type { ValidationIssue } from '@buildcalendar/calendar-core';
import { en, fill } from '../i18n/en';

/**
 * Turns a validator issue into a sentence an admin can act on.
 *
 * `calendar-core` returns codes and parameters so it stays free of interface copy;
 * this is the one place those become English (P1-US-003).
 */
export interface ReadableIssue {
  message: string;
  path: string | null;
}

export function readableIssues(issues: readonly ValidationIssue[]): ReadableIssue[] {
  return issues.map((issue) => {
    const template = en.admin.templateValidation[issue.code];
    return {
      message: fill(template, issue.params ?? {}),
      path: issue.path ?? null,
    };
  });
}
