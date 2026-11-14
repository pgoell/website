import { type NextRequest, NextResponse } from "next/server";
import {
  appUrl,
  env,
  readSession,
  SESSION_COOKIE,
  safeNext,
  setHint,
} from "@/lib/trips/auth";

export async function GET(req: NextRequest) {
  const base = appUrl();
  const next = safeNext(req.nextUrl.searchParams.get("next"), base);

  // Already signed in: no need to see Google again.
  if (await readSession(req.cookies.get(SESSION_COOKIE)?.value)) {
    const res = NextResponse.redirect(next ?? `${base}/trips`);
    setHint(res, true);
    return res;
  }

  const state = crypto.randomUUID();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID"),
    redirect_uri: `${base}/auth/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
  }).toString();

  const res = NextResponse.redirect(url);
  const short = {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/auth",
  } as const;
  res.cookies.set("oauth_state", state, short);
  if (next) res.cookies.set("oauth_next", next, short);
  return res;
}
