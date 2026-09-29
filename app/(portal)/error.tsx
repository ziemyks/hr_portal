"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto mt-16 max-w-lg rounded-lg border border-border bg-surface p-6 text-center">
      <AlertTriangle className="mx-auto mb-3 size-8 text-danger" />
      <h1 className="text-base font-semibold">Neizdevās ielādēt datus</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Datu bāze īslaicīgi nav pieejama vai pieprasījums neizdevās. Ja tas atkārtojas, pārbaudiet servera žurnālu un vides mainīgos
        (skat. README).
      </p>
      {error.digest && <p className="mt-2 font-mono text-[11px] text-fg-subtle">Kods: {error.digest}</p>}
      <Button className="mt-4" onClick={reset}>Mēģināt vēlreiz</Button>
    </div>
  );
}
