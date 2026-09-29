import { NextResponse, type NextRequest } from "next/server";
import { checkPassword, createSessionToken, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth";

function safeNext(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const next = safeNext(form.get("next"));
  const password = String(form.get("password") ?? "");

  if (!(await checkPassword(password))) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "1");
    if (next !== "/") url.searchParams.set("next", next);
    return NextResponse.redirect(url, 303);
  }

  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return res;
}
