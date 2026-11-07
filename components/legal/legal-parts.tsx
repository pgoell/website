import s from "@/components/frame/frame.module.css";
import { FrameTitle } from "@/components/frame/frame-title";

export { s as legalStyles };

/** The page title in a focus frame, with a small line under it. */
export const LegalTitle = FrameTitle;

/** Splits "2. What this website is" into its number and its title. */
export function splitNumber(title: string): { n: string; text: string } {
  const m = /^(\d+)\.\s*(.*)$/.exec(title);
  return m
    ? { n: (m[1] as string).padStart(2, "0"), text: m[2] as string }
    : { n: "", text: title };
}

/** One numbered block of legal text. */
export function LegalSection({
  id,
  n,
  title,
  children,
}: {
  id?: string;
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={s.sec}>
      <h2>
        {n && <span className={s.n}>{n}</span>}
        {title}
      </h2>
      <div className={s.body}>{children}</div>
    </section>
  );
}

/** The list of sections, kept in view beside the text on wide screens. */
export function LegalContents({
  label,
  items,
}: {
  label: string;
  items: { id: string; n: string; text: string }[];
}) {
  return (
    <nav className={s.toc} aria-label={label}>
      <div className={s.tocHd}>{label}</div>
      <ol>
        {items.map((it) => (
          <li key={it.id}>
            <a href={`#${it.id}`}>
              <span className={s.n}>{it.n}</span>
              {it.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
