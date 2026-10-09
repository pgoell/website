"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import type { GithubStats } from "@/lib/stats/github";
import type { SpotifyTop } from "@/lib/stats/spotify";
import {
  buildMenu,
  GITHUB,
  LINKEDIN,
  MAIL,
  type PostLink,
} from "@/lib/viewfinder/menu";
import { PROJECTS } from "@/lib/viewfinder/projects";
import { CameraMenu } from "./camera-menu";
import { cx } from "./cx";
import { Evf } from "./evf";
import { hudFont, monoFont, semiFont } from "./fonts";
import { LocationMap } from "./location-map";
import { PlaybackWindow } from "./playback-window";
import { useViewfinder } from "./use-viewfinder";
import s from "./viewfinder.module.css";

const ART_FONTS = {
  mono: monoFont.style.fontFamily,
  hud: hudFont.style.fontFamily,
};

/** The home page: a camera viewfinder over Gelnhausen, then the work on a map. */
export function ViewfinderHome({
  posts,
  github,
  spotify,
}: {
  posts: PostLink[];
  github: GithubStats | null;
  spotify: SpotifyTop | null;
}) {
  const t = useTranslations("home");
  const locale = useLocale();
  const vf = useViewfinder();
  const [powered, setPowered] = useState(false);
  const onPowerOn = useCallback(() => setPowered(true), []);
  const tabs = useMemo(
    () => buildMenu(posts, { github, spotify }),
    [posts, github, spotify],
  );
  const other = locale === "en" ? "de" : "en";

  const shootLink = (target: string) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    vf.shoot(target);
  };

  return (
    <div
      className={cx(
        s.root,
        hudFont.variable,
        semiFont.variable,
        monoFont.variable,
        !powered && s.off,
        vf.onlyMap && s.onlyMap,
      )}
    >
      <a className={s.skip} href="#work">
        {t("peek.map").replace(" ▾", "")}
      </a>
      <Evf
        at={vf.at}
        mode={vf.mode}
        shots={vf.shots}
        onShoot={vf.shoot}
        onMenu={() => vf.openMenu({ tab: vf.lastTab })}
        onCycleMode={vf.cycleMode}
        fnRef={vf.fnRef}
        onPowerOn={onPowerOn}
        github={github}
      />

      <div className={s.peek}>
        <b>{t("peek.playback")}</b>
        <span className={s.hideM}>100MSDCF</span>
        <span>{t("peek.mapped")}</span>
        <span className={s.sp} />
        <span className={s.hideM}>{t("peek.files")}</span>
        <button type="button" onClick={() => vf.shoot("#work")}>
          {t("peek.map")}
        </button>
      </div>

      <section className={s.loc} id="work" aria-labelledby="work-title">
        <div className={s.lhead}>
          <h2 id="work-title">
            <small>{t("map.kicker")}</small>
            {t("map.title")}
          </h2>
          <p>{t("map.intro")}</p>
        </div>
        <LocationMap
          pick={vf.pick}
          onPick={vf.setPick}
          onOpen={vf.openPlayback}
          onReady={() => vf.setMapReady(true)}
          monoFamily={ART_FONTS.mono}
        />
        <div className={s.folders} id="more">
          <Link href={`/${locale}/blog`} onClick={shootLink("/blog")}>
            <span>{t("folders.writing.s")}</span>
            <strong>{t("folders.writing.t")}</strong>
            <p>{t("folders.writing.p")}</p>
          </Link>
          {(["books", "music", "photos"] as const).map((k) => (
            <div key={k}>
              <span>{t(`folders.${k}.s`)}</span>
              <strong>{t(`folders.${k}.t`)}</strong>
              <p>{t(`folders.${k}.p`)}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className={s.footer} id="contact">
        <span className={s.logo} style={{ color: "var(--ink)" }}>
          pg
          <i />
        </span>
        <a href={MAIL}>{t("footer.contact")}</a>
        <a href={GITHUB}>GitHub</a>
        <a href={LINKEDIN}>LinkedIn</a>
        <Link href={`/${locale}/blog`}>{t("footer.blog")}</Link>
        <Link href={`/${locale}/games`}>{t("footer.games")}</Link>
        <Link href={`/${locale}/tools`}>{t("footer.tools")}</Link>
        <Link href={`/${locale}/impressum`}>{t("footer.impressum")}</Link>
        <Link href={`/${locale}/datenschutz`}>{t("footer.datenschutz")}</Link>
        <span className={s.sp} />
        <Link href={`/${other}`} hrefLang={other}>
          {t("footer.language")}
        </Link>
        <span>{t("footer.place")}</span>
      </footer>

      {vf.menu ? (
        <CameraMenu
          key={JSON.stringify(vf.menu)}
          tabs={tabs}
          request={vf.menu}
          onClose={vf.closeMenu}
          onAction={vf.runAction}
          onTab={vf.setLastTab}
        />
      ) : null}
      {vf.playback !== null && PROJECTS[vf.playback] ? (
        <PlaybackWindow
          index={vf.playback}
          onClose={vf.closePlayback}
          onGo={vf.openPlayback}
          fonts={ART_FONTS}
        />
      ) : null}
      <div className={s.curtain} ref={vf.curtainRef} aria-hidden="true">
        <i />
        <b />
      </div>
    </div>
  );
}
