import Link from "next/link";
import type { CardArt, CatalogEntry } from "@/lib/site/catalog";
import { fileNumber } from "@/lib/site/catalog";
import s from "./site.module.css";

const BINGO = "x--x--x------x--x--x----x";

function Art({ kind }: { kind: CardArt }) {
  switch (kind) {
    case "tiles":
      return (
        <div className={s.tiles}>
          {["g", "", "y", "", "g"].map((c, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed picture
            <b key={i} className={c ? s[c] : undefined} />
          ))}
        </div>
      );
    case "dice":
      return (
        <div className={s.dice}>
          <b />
          <b />
          <b />
        </div>
      );
    case "bingo":
      return (
        <div className={s.bingo}>
          {[...BINGO].map((c, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed picture
            <b key={i} className={c === "x" ? s.x : undefined} />
          ))}
        </div>
      );
    case "ring":
      return <div className={s.ring}>25</div>;
  }
}

/** Games or tools as playback thumbnails, each with a camera file number. */
export function CatalogGrid({
  locale,
  entries,
  folder,
  label,
}: {
  locale: string;
  entries: readonly CatalogEntry[];
  folder: number;
  label: (e: CatalogEntry) => { title: string; text: string; tag: string };
}) {
  return (
    <ul className={s.grid}>
      {entries.map((e, i) => {
        const l = label(e);
        return (
          <li key={e.id} style={{ display: "contents" }}>
            <Link href={`/${locale}${e.path}`} className={s.card}>
              <div className={s.thumb} aria-hidden="true">
                <Art kind={e.art} />
              </div>
              <div className={s.cap}>
                <div className={s.no}>
                  <span>{fileNumber(i + 1, folder)}</span>
                  <span>{l.tag}</span>
                </div>
                <h2>{l.title}</h2>
                <p>{l.text}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
