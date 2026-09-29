import type { Metadata } from "next";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = { title: "Pieslēgties" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form action="/api/login" method="post" className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <LockKeyhole className="size-5" />
          </span>
          <div>
            <h1 className="text-base font-semibold">Darba tirgus portāls</h1>
            <p className="text-xs text-fg-subtle">Ievadiet portāla paroli</p>
          </div>
        </div>
        <input type="hidden" name="next" value={next ?? "/"} />
        <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-fg-muted">
          Parole
        </label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required autoFocus aria-invalid={!!error} />
        {error && (
          <p role="alert" className="mt-2 text-xs text-danger">
            Nepareiza parole. Mēģiniet vēlreiz.
          </p>
        )}
        <Button type="submit" variant="primary" className="mt-4 w-full justify-center">
          Pieslēgties
        </Button>
      </form>
    </main>
  );
}
