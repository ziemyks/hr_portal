import type { Metadata } from "next";
import { CompanyPicker } from "@/components/company/company-picker";
import { CompanyTable } from "@/components/company/company-table";
import { PageHeader } from "@/components/page-header";
import { getCompanyList } from "@/lib/queries";

export const metadata: Metadata = { title: "Uzņēmumi" };
// Live data: render per request (never at build time; data refreshes ~3×/day, fetches are cached 15 min).
export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const rows = await getCompanyList();
  return (
    <div className="space-y-5">
      <PageHeader
        title="Uzņēmumi"
        description="Visi darba devēji ar sludinājumiem. Izvēlieties uzņēmumu, lai redzētu pilnu analīzi salīdzinājumā ar tirgu."
        actions={<CompanyPicker companies={rows} className="w-72" />}
      />
      <CompanyTable rows={rows} />
    </div>
  );
}
