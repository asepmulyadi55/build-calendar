/**
 * Stand-in for the `server-only` package under Vitest.
 *
 * `server-only` throws when imported outside a React Server Component, which is
 * exactly what it is for — it turns "this module leaked into the client bundle"
 * into a build error. Tests are neither, so they get this empty module instead.
 * The guard still applies to the real build.
 */
export {};
