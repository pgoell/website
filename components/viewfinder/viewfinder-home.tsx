"use client";

import { useCallback, useMemo, useState } from "react";
import type { GithubStats } from "@/lib/stats/github";
import type { Book } from "@/lib/stats/kasten";
import type { Range, SpotifyStats } from "@/lib/stats/spotify";
import {
  buildMenu,
  type PostLink,
  type TripLink,
  visibleMenu,
} from "@/lib/viewfinder/menu";
import { PROJECTS } from "@/lib/viewfinder/projects";
import type { Weather } from "@/lib/weather/weather";
import { CameraMenu } from "./camera-menu";
import { cx } from "./cx";
import { Evf } from "./evf";
import { hudFont, monoFont, semiFont } from "./fonts";
import { PlaybackWindow } from "./playback-window";
import { useNowPlaying, useWeather } from "./readouts";
import { ScenePanel } from "./scene-panel";
import { useAmbience } from "./use-ambience";
import { useViewfinder } from "./use-viewfinder";
import s from "./viewfinder.module.css";

const ART_FONTS = {
  mono: monoFont.style.fontFamily,
  hud: hudFont.style.fontFamily,
};

/** The home page: a camera viewfinder over Gelnhausen, with the contact links laid over it. */
export function ViewfinderHome({
  posts,
  trips,
  github,
  spotify,
  weather: initialWeather,
  book,
}: {
  posts: PostLink[];
  trips: TripLink[];
  github: GithubStats | null;
  spotify: SpotifyStats | null;
  weather: Weather | null;
  book: Book | null;
}) {
  const vf = useViewfinder();
  const weather = useWeather(initialWeather);
  const sky = vf.weatherOverride ?? weather?.scene ?? null;
  const sound = useAmbience(sky, vf.at);
  const [powered, setPowered] = useState(false);
  const onPowerOn = useCallback(() => setPowered(true), []);
  const { setSceneOpen } = vf;
  const closeScene = useCallback(() => setSceneOpen(false), [setSceneOpen]);
  const listening = useNowPlaying();
  const [range, setRange] = useState<Range>("short_term");
  const tabs = useMemo(
    () =>
      visibleMenu(
        buildMenu(posts, { spotify, listening, range, now: new Date() }, trips),
      ),
    [posts, spotify, listening, range, trips],
  );

  return (
    <div
      className={cx(
        s.root,
        hudFont.variable,
        semiFont.variable,
        monoFont.variable,
        !powered && s.off,
      )}
    >
      <Evf
        at={vf.at}
        temperature={weather?.temperature ?? null}
        weather={sky}
        mode={vf.mode}
        onMenu={() => vf.openMenu({ tab: "main" })}
        listening={listening}
        onMusic={() => vf.openMenu({ tab: "music" })}
        onCycleMode={vf.cycleMode}
        onPowerOn={onPowerOn}
        github={github}
        book={book}
        onScene={() => vf.setSceneOpen((o) => !o)}
        sceneOpen={vf.sceneOpen}
        soundOn={sound.on}
        onSound={sound.toggle}
        scenePanel={
          vf.sceneOpen ? (
            <ScenePanel
              at={vf.at}
              scene={vf.scene}
              onChange={vf.setScene}
              onClose={closeScene}
            />
          ) : null
        }
      />

      {vf.menu ? (
        <CameraMenu
          key={JSON.stringify(vf.menu)}
          tabs={tabs}
          request={vf.menu}
          onClose={vf.closeMenu}
          onAction={vf.runAction}
          range={range}
          onRange={setRange}
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
