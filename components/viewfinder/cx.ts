/** Joins class names, skipping falsy ones. */
export const cx = (...c: Array<string | false | null | undefined>): string =>
  c.filter(Boolean).join(" ");

/** A CSS module class that is known to exist, for classList calls. */
export const cls = (name: string | undefined): string => name as string;
