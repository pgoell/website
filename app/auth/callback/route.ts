import { createRemoteJWKSet, jwtVerify } from "jose";
import { type NextRequest, NextResponse } from "next/server";
import {
  appUrl,
  env,
  SESSION_COOKIE,
  SESSION_DAYS,
  safeNext,
  setHint,
  signSession,
} from "@/lib/trips/auth";

const googleKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state || state !== req.cookies.get("oauth_state")?.value) {
    return new NextResponse("Sign-in failed, try again.", { status: 400 });
  }

  const base = appUrl();
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      code,
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      redirect_uri: `${base}/auth/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    return new NextResponse("Sign-in failed, try again.", { status: 400 });
  }
  const { id_token } = (await tokenRes.json()) as { id_token: string };
  const { payload } = await jwtVerify(id_token, googleKeys, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: env("GOOGLE_CLIENT_ID"),
  });

  const email = String(payload.email).toLowerCase();
  const allowed = env("ALLOWED_EMAILS")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim());
  if (!payload.email_verified || !allowed.includes(email)) {
    return new NextResponse(`${email} has no access to the trips.`, {
      status: 403,
    });
  }

  const name = String(payload.given_name ?? payload.name ?? email);
  const next = safeNext(req.cookies.get("oauth_next")?.value ?? null, base);
  const res = NextResponse.redirect(next ?? `${base}/trips`);
  res.cookies.set(SESSION_COOKIE, await signSession({ email, name }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_DAYS * 86400,
    path: "/",
  });
  setHint(res, true);
  res.cookies.delete({ name: "oauth_state", path: "/auth" });
  res.cookies.delete({ name: "oauth_next", path: "/auth" });
  return res;
}
