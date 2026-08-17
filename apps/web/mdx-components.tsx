import type { MDXComponents } from 'mdx/types';

/**
 * Legal pages are prose. They inherit the design system's `.legal` styles rather
 * than carrying markup of their own, so an edit to a policy is a text edit.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
  };
}
