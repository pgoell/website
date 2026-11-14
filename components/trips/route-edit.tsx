"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { hours, km, type Way, wayOf } from "@/lib/trips/route";
import s from "./trips.module.css";
import type { RouteEdit } from "./use-route-edit";

type State = NonNullable<RouteEdit["state"]>;

const WAYS: Way[] = ["road", "straight", "free"];

/** The bar of a leg's line while it is bent: what it is, how long, and back. */
export function RouteBar({
  route,
  state,
  locale,
}: {
  route: RouteEdit;
  state: State;
  locale: string;
}) {
  const t = useTranslations("site.trips");
  // "First route" gives up the drawn line, so it asks first.
  const [asking, setAsking] = useState(false);
  const byHand = state.byHand !== null;

  // The keys a desk expects: undo, redo, and Escape to step back.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target as Element).tagName))
        return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) route.redo();
        else route.undo();
      } else if (e.key === "Escape") {
        // Escape steps back in the editor, never out of the page.
        e.preventDefault();
        if (byHand) route.cancelStroke();
        else if (state.selected !== null) route.select(null);
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        state.selected !== null
      ) {
        route.remove(state.selected);
      }
    };
    // Before the frame's own Escape, which leaves for the home page.
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [route, byHand, state.selected]);

  const status = state.error
    ? t(`error.${state.error}`)
    : state.noRoad
      ? t("route.noRoad")
      : byHand
        ? t("route.drawHint")
        : state.waiting
          ? t("route.looking")
          : state.saving === "saving"
            ? t("route.saving")
            : state.saving === "saved"
              ? t("route.saved")
              : t("route.hint");

  return (
    <div
      className={s.routeBar}
      data-warn={state.error || state.noRoad ? true : undefined}
    >
      <div className={s.routeHead}>
        <p className={s.routeTitle}>
          <b>{byHand ? t("route.draw") : t("route.title")}</b>
          <span>{state.leg.title}</span>
        </p>
        <p className={s.routeStats}>
          {km(state.m, locale)}
          {state.s > 0 && (
            <>
              {" "}
              · {hours(state.s)}
              {state.stretches.some((x) => x.kind !== "road") &&
                ` ${t("route.byRoad")}`}
            </>
          )}
          {!state.leg.own && (
            <small>{t("route.was", { length: km(state.was, locale) })}</small>
          )}
        </p>
      </div>
      {asking ? (
        <div className={s.routeKeys}>
          <p>{t("route.askFirst")}</p>
          <button type="button" onClick={() => setAsking(false)}>
            {t("route.keep")}
          </button>
          <button
            type="button"
            className={s.routeDone}
            onClick={() => {
              setAsking(false);
              route.reset();
            }}
          >
            {t("route.goBack")}
          </button>
        </div>
      ) : byHand ? (
        <div className={s.routeKeys}>
          <button type="button" onClick={route.cancelStroke}>
            {t("edit.cancel")}
          </button>
        </div>
      ) : (
        <div className={s.routeKeys}>
          <button type="button" disabled={!state.canUndo} onClick={route.undo}>
            <span aria-hidden="true">↶</span> {t("route.undo")}
          </button>
          <button type="button" disabled={!state.canRedo} onClick={route.redo}>
            <span aria-hidden="true">↷</span> {t("route.redo")}
          </button>
          {state.canReset && (
            <button type="button" onClick={() => setAsking(true)}>
              {t("route.first")}
            </button>
          )}
          <button type="button" className={s.routeDone} onClick={route.done}>
            {t("route.done")}
          </button>
        </div>
      )}
      <p className={s.routeStatus} aria-live="polite">
        {status}
      </p>
    </div>
  );
}

/** What a picked point of the line offers: how the way runs on, and its end. */
export function RouteMenu({
  route,
  state,
}: {
  route: RouteEdit;
  state: State;
}) {
  const t = useTranslations("site.trips");
  const i = state.selected;
  if (i === null) return null;
  const last = state.points.length - 1;
  const next = state.points[i + 1];
  return (
    <div className={s.routeMenuBox}>
      <h4>
        {i === 0
          ? t("route.start")
          : i === last
            ? t("route.end")
            : t("route.point", { n: i, of: last - 1 })}
      </h4>
      {next && (
        <>
          <p>{t("route.wayOn")}</p>
          <div className={s.routeWays}>
            {WAYS.map((way) => (
              <button
                key={way}
                type="button"
                aria-pressed={wayOf(next) === way}
                onClick={() => route.way(i, way)}
              >
                {t(`route.way.${way}`)}
              </button>
            ))}
          </div>
        </>
      )}
      <button
        type="button"
        className={s.routeRemove}
        disabled={last < 2}
        onClick={() => route.remove(i)}
      >
        {t("route.remove")} <span aria-hidden="true">✕</span>
      </button>
    </div>
  );
}
