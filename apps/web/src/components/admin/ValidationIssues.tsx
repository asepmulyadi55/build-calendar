import { en } from '@/lib/i18n/en';
import type { ReadableIssue } from '@/lib/admin/validation-messages';

/**
 * Every problem the validator found, listed at once.
 *
 * Showing one error at a time across a twelve-sheet template is a bad afternoon,
 * which is why the validator collects rather than throwing on the first.
 */
export function ValidationIssues({ issues }: { issues: ReadableIssue[] | undefined }) {
  if (!issues || issues.length === 0) return null;

  return (
    <div className="admin-issues" role="alert">
      <b className="h3">{en.admin.templateValidation.heading}</b>
      <p className="small muted">{en.admin.templateValidation.lede}</p>
      <ul>
        {issues.map((issue, index) => (
          <li key={index}>
            {issue.message}
            {issue.path && (
              <>
                {' '}
                <code>{issue.path}</code>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
