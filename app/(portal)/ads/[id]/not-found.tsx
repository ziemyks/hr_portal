import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

export default function AdNotFound() {
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <FileQuestion className="mx-auto mb-3 size-8 text-fg-subtle" />
      <h1 className="text-base font-semibold">Sludinājums nav atrasts</h1>
      <p className="mt-1 text-sm text-fg-muted">Tas varētu būt paslēpts kā LV/EN dublikāts vai saite ir nepareiza.</p>
      <Link href="/ads" className={buttonClass("outline", "md", "mt-4")}>Uz sludinājumiem</Link>
    </div>
  );
}
