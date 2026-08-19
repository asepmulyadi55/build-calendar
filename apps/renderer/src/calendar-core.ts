/**
 * The renderer's door into `calendar-core`.
 *
 * `calendar-core` ships raw TypeScript so the editor and the renderer read exactly
 * the same source — AR-01 allows one engine, and a published build could drift from
 * it. Node cannot import a `.ts` file, so the renderer compiles that source into its
 * own `dist` (see `tsconfig.build.json`).
 *
 * The import has to be relative for the compiled output to resolve: a bare
 * `@buildcalendar/calendar-core` survives emit unchanged and would send Node back to
 * the raw source at runtime. Routing every renderer import through this one file
 * keeps that awkwardness in a single place.
 */
export * from '../../../packages/calendar-core/src/index.js';
