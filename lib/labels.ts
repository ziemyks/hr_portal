// Latvian UI labels for enumerations (blt-data-dictionary.md §5).

export const WORK_MODE: Record<string, string> = {
  ON_SITE: "Klātienē",
  HYBRID: "Hibrīds",
  FULLY_REMOTE: "Attālināti",
  UNKNOWN: "Nav norādīts",
};

export const WORK_TIME: Record<string, string> = {
  FULL_TIME: "Pilna slodze",
  PART_TIME: "Nepilna slodze",
  FIXED_TERM: "Uz noteiktu laiku",
  FULL_TIME_WITH_SHIFTS: "Maiņu darbs",
  PRACTICE: "Prakse",
  FREELANCE: "Ārštata",
  WORK_AFTER_CLASSES: "Darbs pēc mācībām",
};

export const SENIORITY: Record<string, string> = {
  intern: "Praktikants",
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  lead: "Lead",
  manager: "Vadītājs",
  director: "Direktors",
  unknown: "Nav noteikts",
};
export const SENIORITY_ORDER = ["intern", "junior", "mid", "senior", "lead", "manager", "director", "unknown"];

export const CATEGORY: Record<string, string> = {
  INFORMATION_TECHNOLOGY: "IT",
  BANKING_INSURANCE: "Banku / apdrošināšanas",
  FINANCE_ACCOUNTING: "Finanses / grāmatvedība",
  TECHNICAL_ENGINEERING: "Tehniskās / inženierzinātnes",
  ORGANISATION_MANAGEMENT: "Organizācija / vadība",
  ELECTRONICS_TELECOM: "Elektronika / telekomunikācijas",
  ADMINISTRATION: "Administrācija",
  SALES: "Pārdošana",
  MARKETING_ADVERTISING: "Mārketings / reklāma",
  CUSTOMER_SERVICE: "Klientu apkalpošana",
  HUMAN_RESOURCES: "Personāla vadība",
  LAW_LEGAL: "Jurisprudence",
  STATE_PUBLIC_ADMIN: "Valsts pārvalde",
  PRODUCTION_MANUFACTURING: "Ražošana",
  LOGISTICS_TRANSPORT: "Loģistika / transports",
  EDUCATION_SCIENCE: "Izglītība / zinātne",
  CONSULTING: "Konsultācijas",
};

export const AD_FORMAT: Record<string, string> = {
  text: "Teksta sludinājums",
  image: "Attēla sludinājums (OCR)",
  iframe: "Iegults ārējs sludinājums",
  branded: "Zīmola lapa",
  pending: "Gaida apstrādi",
};

export const SALARY_PERIOD: Record<string, string> = { MONTHLY: "/mēn.", HOURLY: "/h", YEARLY: "/gadā" };

export const label = (map: Record<string, string>, key: string | null | undefined) =>
  key ? (map[key] ?? key.replace(/_/g, " ").toLowerCase()) : "—";

export const catLabel = (k: string | null | undefined) => label(CATEGORY, k);

/** Capitalised language name, e.g. "angļu" → "Angļu". */
export const langLabel = (k: string) => k.charAt(0).toLocaleUpperCase("lv") + k.slice(1);

/** Heuristic: posters that are recruitment agencies (the real employer is elsewhere, §10). */
export const isRecruiter = (company: string) =>
  /(recruit|personāl|personal|atlase|cv-online|workforce|headhunt)/i.test(company);
