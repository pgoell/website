import Link from "next/link";
import { FrameTitle } from "@/components/frame/frame-title";
import s from "./site.module.css";

/** A game or tool on the camera screen: a way up, the framed title, a short lede, the app. */
export function AppPage({
  up,
  title,
  sub,
  lede,
  children,
}: {
  up: { href: string; label: string };
  title: string;
  sub: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Link href={up.href} className={s.up}>
        ◂ {up.label}
      </Link>
      <FrameTitle title={title} sub={sub} />
      {lede && <p className={s.lede}>{lede}</p>}
      <div className={s.appBody}>{children}</div>
    </>
  );
}
