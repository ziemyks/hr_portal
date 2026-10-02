import { NextResponse, type NextRequest } from "next/server";
import { checkPassword, createSessionToken, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth";
import { dbFresh } from "@/lib/supabase.server";

// Brute-force limit (sql/003_login_limit.sql). Only failed attempts count.
// The global cap is what protects a short password: it holds even when the attacker rotates IPs.
// Logged-in users keep their session cookie, so hitting it only blocks new logins for a while.
const LIMIT = { ipMax: 5, ipWindowS: 15 * 60, allMax: 30, allWindowS: 60 * 60 };
const MIN_RESPONSE_MS = 600; // success and failure take the same time, so timing doesn't reveal the answer

function safeNext(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

// Vercel sets x-real-ip / x-forwarded-for itself (client-sent values are overwritten).
function clientIp(req: NextRequest) {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  const form = await req.formData();
  const next = safeNext(form.get("next"));
  const password = String(form.get("password") ?? "");
  const ip = clientIp(req);

  const done = async (res: NextResponse) => {
    await new Promise((r) => setTimeout(r, Math.max(0, MIN_RESPONSE_MS - (Date.now() - started))));
    return res;
  };
  const back = (params: Record<string, string>) => {
    const url = new URL("/login", req.url);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    if (next !== "/") url.searchParams.set("next", next);
    return done(NextResponse.redirect(url, 303));
  };

  // Fails closed: if the limiter can't be reached, nobody gets to guess.
  const { data, error } = await dbFresh().rpc("login_attempt", {
    p_ip: ip,
    p_ip_max: LIMIT.ipMax,
    p_ip_window_s: LIMIT.ipWindowS,
    p_all_max: LIMIT.allMax,
    p_all_window_s: LIMIT.allWindowS,
  });
  if (error || !data) {
    console.error("login_attempt failed", error);
    return back({ error: "unavailable" });
  }
  const attempt = data as { allowed: boolean; id?: number; retry_after?: number };
  if (!attempt.allowed) {
    return back({ error: "locked", wait: String(Math.ceil((attempt.retry_after ?? 60) / 60)) });
  }

  if (!(await checkPassword(password))) return back({ error: "1" });

  const { error: clearError } = await dbFresh().rpc("login_succeeded", { p_id: attempt.id, p_ip: ip });
  if (clearError) console.error("login_succeeded failed", clearError);

  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return done(res);
}
