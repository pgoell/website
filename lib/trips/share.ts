/**
 * What another app shared to Trips, as an idea. Apps differ in where they put
 * the link: some send it as `url`, most Android apps put it inside `text`.
 * Pure; `app/share/route.ts` saves it.
 */

export type SharedIdea = {
  name: string;
  url: string | null;
  note: string | null;
};

export function sharedIdea(params: URLSearchParams): SharedIdea | null {
  const title = params.get("title")?.trim() ?? "";
  const text = params.get("text")?.trim() ?? "";
  const url =
    params.get("url")?.trim() || text.match(/https?:\/\/\S+/)?.[0] || null;
  const words = text.replace(url ?? "", "").trim();
  let host = "";
  try {
    host = url ? new URL(url).hostname.replace(/^www\./, "") : "";
  } catch {
    // Not a link after all: the words carry it.
  }
  const name = title || words || host;
  if (!name) return null;
  return {
    name: name.slice(0, 80),
    url,
    note: title && words ? words : name.length > 80 ? name : null,
  };
}
