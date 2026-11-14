import { type NextRequest, NextResponse } from "next/server";
import { appUrl, SESSION_COOKIE, safeNext, setHint } from "@/lib/trips/auth";

// A form on the trip pages posts here.
export async function POST(req: NextRequest) {
  const base = appUrl();
  const form = await req.formData().catch(() => null);
  const next = safeNext(String(form?.get("next") ?? ""), base) ?? base;
  const res = NextResponse.redirect(next, 303);
  res.cookies.delete({ name: SESSION_COOKIE, path: "/" });
  setHint(res, false);
  return res;
}
