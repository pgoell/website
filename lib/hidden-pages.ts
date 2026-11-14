/**
 * Sections of the site that are switched off for now. Their pages and code
 * stay in the repo; the proxy sends visitors home and no link points at them.
 * Remove an entry to bring a section back.
 */
export const HIDDEN_PAGES: readonly string[] = ["/games", "/tools"];

/** True when a path without the locale prefix falls under a hidden section. */
export function isHiddenPage(path: string): boolean {
  return HIDDEN_PAGES.some((p) => path === p || path.startsWith(`${p}/`));
}
