/**
 * Sign-in for the trip pages: Google, limited to `ALLOWED_EMAILS`, kept in a
 * signed cookie on this host. Server only.
 */

import { jwtVerify, SignJWT } from "jose";
import type { NextResponse } from "next/server";
import { HINT_COOKIE } from "./private";

export const SESSION_COOKIE = "trips_session";
export const SESSION_DAYS = 90;

export type User = { email: string; name: string };

// `next dev` without a Google client: signed in as Dev, so the pages run
// locally without secrets.
const DEV_USER: User | null =
  process.env.NODE_ENV === "development" && !process.env.GOOGLE_CLIENT_ID
    ? { email: "dev@localhost", name: "Dev" }
    : null;

export function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const secret = () => new TextEncoder().encode(env("AUTH_SECRET"));

export function signSession(user: User): Promise<string> {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function readSession(token?: string): Promise<User | null> {
  if (DEV_USER) return DEV_USER;
  if (!token || !process.env.AUTH_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { email: String(payload.email), name: String(payload.name) };
  } catch {
    return null;
  }
}

/** This site's address (`APP_URL`), for Google's redirect and for `next`. */
export const appUrl = (): string => env("APP_URL");

/**
 * Where to send someone after sign-in or sign-out: a page of this site,
 * nothing else, so `next` cannot become an open redirect.
 */
export function safeNext(next: string | null, base: string): string | null {
  if (!next) return null;
  try {
    const url = new URL(next, base);
    if (url.origin !== new URL(base).origin) return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** The hint cookie the pages read to know a sign-in is worth asking about. */
export function setHint(res: NextResponse, on: boolean) {
  res.cookies.set(HINT_COOKIE, on ? "1" : "", {
    secure: true,
    sameSite: "lax",
    maxAge: on ? SESSION_DAYS * 86400 : 0,
    path: "/",
  });
}
