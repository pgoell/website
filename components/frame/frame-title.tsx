import { cx } from "@/components/viewfinder/cx";
import s from "./frame.module.css";

/** The page title in a focus frame, with a small line under it. */
export function FrameTitle({
  title,
  sub,
  long,
}: {
  title: string;
  sub: string;
  /** Smaller type, for titles that run to a sentence, such as blog posts. */
  long?: boolean;
}) {
  return (
    <div className={cx(s.title, long && s.long)}>
      <i />
      <i />
      <i />
      <i />
      <h1>{title}</h1>
      <p>{sub}</p>
    </div>
  );
}
