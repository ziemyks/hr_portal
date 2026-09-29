// Row shapes of blt.listings_portal (see blt-data-dictionary.md §3 and sql/001_portal_views.sql).

export type Section = { title: string; text: string };

export type Listing = {
  id: string;
  source: string;
  url: string;
  apply_url: string | null;
  title: string;
  company: string;
  category: string;

  first_published_at: string | null;
  published_at: string | null;
  last_published_at: string | null;
  times_renewed: number;
  renewal_dates: string[];
  deadline: string | null;
  days_open: number | null;

  town: string | null;
  address: string | null;
  work_mode: string | null;
  work_times: string[] | null;

  salary_from: number | null;
  salary_to: number | null;
  salary_period: string | null;
  salary_basis: string | null;

  sections: Section[] | null;
  ad_image_text: string | null;
  description: string | null;
  screenshot_url: string | null;

  summary: string | null;
  responsibilities: string[] | null;
  requirements: string[] | null;
  benefits: string[] | null;
  skills: string[] | null;
  languages: string[] | null;
  seniority: string | null;
  experience_years_min: number | null;
  education: string | null;

  is_repeating: boolean;
  times_posted: number;
  repost_of: string | null;
  repost_root: string | null;

  scraped_at: string;
  visited_at: string | null;
  enriched_at: string | null;
  enrich_model: string | null;
  enrich_error: string | null;
  enrichment: Enrichment | null;

  raw_data: Record<string, unknown> | null;
  detail_data: DetailData | null;

  // computed by blt.listings_portal
  is_active: boolean | null;
  closing_soon: boolean | null;
  salary_mid: number | null;
  salary_mid_monthly: number | null;
  ad_format: AdFormat;
  skills_norm: string[];
  languages_norm: string[];
  categories_all: string[];
  views: number | null;
  title_norm: string;
};

export type AdFormat = "text" | "image" | "iframe" | "branded" | "pending";

export type Enrichment = {
  dropped_ungrounded?: Record<string, number>;
  source_chars?: number;
  salary_from_text?: boolean;
};

export type DetailData = {
  views?: number;
  urlDetailsType?: string;
  details?: { urlDetails?: string; fileDetails?: { fileId?: string } | null };
  settings?: { categories?: string[]; keywords?: { id?: number; value: string }[]; applyingUrl?: string };
  employer?: { about?: string; webpageUrl?: string; videoUrl?: string };
  questions?: { value: string; type?: string; mandatory?: boolean }[];
  highlights?: { flexibleSchedule?: boolean };
};

/** Columns needed for list rows / cards (keep payload small, no JSON blobs). */
export const LIST_COLUMNS = [
  "id", "title", "company", "category", "town", "work_mode", "work_times",
  "salary_from", "salary_to", "salary_period", "salary_basis", "seniority", "summary",
  "skills", "skills_norm", "is_repeating", "times_posted", "times_renewed", "days_open",
  "first_published_at", "deadline", "is_active", "closing_soon", "views", "url", "apply_url",
  "enriched_at", "ad_format",
].join(",");

export type ListingRow = Pick<
  Listing,
  | "id" | "title" | "company" | "category" | "town" | "work_mode" | "work_times"
  | "salary_from" | "salary_to" | "salary_period" | "salary_basis" | "seniority" | "summary"
  | "skills" | "skills_norm" | "is_repeating" | "times_posted" | "times_renewed" | "days_open"
  | "first_published_at" | "deadline" | "is_active" | "closing_soon" | "views" | "url" | "apply_url"
  | "enriched_at" | "ad_format"
>;

export type SimilarListing = {
  id: string;
  title: string;
  company: string;
  town: string | null;
  salary_from: number | null;
  salary_to: number | null;
  salary_period: string | null;
  seniority: string | null;
  work_mode: string | null;
  is_active: boolean | null;
  deadline: string | null;
  first_published_at: string | null;
  score: number;
  title_sim: number;
  shared_skills: string[];
};

export type Facet = { value: string; n: number; label?: string };

export type Facets = {
  total: number;
  active: number;
  companies: Facet[];
  towns: Facet[];
  skills: Facet[];
  languages: Facet[];
  categories: Facet[];
};

export type KeyN = { key: string; n: number };
export type SalaryStat = { key: string; n: number; p25: number | null; median: number | null; p75: number | null };

export type Dashboard = {
  generated_at: string;
  kpi: {
    total: number;
    active: number;
    inactive: number;
    new_7d: number;
    new_prev_7d: number;
    closing_soon: number;
    repeating_active: number;
    avg_days_open_active: number | null;
    median_salary_active: number | null;
    median_salary_all: number | null;
    hourly_ads: number;
    companies_active: number;
  };
  weekly_new: { week: string; category: string; n: number }[];
  open_by_day: { day: string; n: number }[];
  salary_by_seniority: SalaryStat[];
  salary_by_category: SalaryStat[];
  top_skills: {
    key: string; label: string; n: number; n_active: number;
    n_recent: number; n_prev: number; median_salary: number | null;
  }[];
  seniority: KeyN[];
  work_mode: KeyN[];
  work_times: KeyN[];
  languages: KeyN[];
  towns: KeyN[];
  categories_all: KeyN[];
  ad_format: KeyN[];
  apply_channel: { own: number; cvlv: number };
  experience: KeyN[];
  companies: { key: string; n: number; n_active: number; recruiter: boolean }[];
  hardest_to_fill: {
    id: string; title: string; company: string; days_open: number | null;
    times_posted: number; times_renewed: number; is_repeating: boolean; deadline: string | null;
  }[];
  closing_soon: {
    id: string; title: string; company: string; deadline: string;
    salary_from: number | null; salary_to: number | null; salary_period: string | null;
  }[];
  most_viewed: { id: string; title: string; company: string; views: number; views_per_day: number }[];
};

// ---- Company analysis (sql/002_company_views.sql) ----

export type CompanyRow = {
  company: string;
  n: number;
  n_active: number;
  median_salary: number | null;
  avg_days_open: number | null;
  n_repeating: number;
  first_seen: string | null;
  last_posted: string | null;
  main_category: string | null;
  recruiter: boolean;
};

/** A mix item: company share next to the market share (both in %). */
export type MixItem = { key: string; n: number; pct: number; market_pct: number };

export type CompanyProfile = {
  company: string;
  generated_at: string;
  recruiter: boolean;
  kpi: {
    total: number; active: number; inactive: number;
    market_total: number; market_active: number; companies_total: number; rank_active: number;
    first_seen: string | null; last_posted: string | null; new_30d: number;
    median_salary: number | null; market_median_salary: number | null; salary_n: number;
    avg_days_open: number | null; market_avg_days_open: number | null;
    repeating: number; market_repeating_pct: number | null;
    avg_views: number | null; market_avg_views: number | null;
    avg_experience: number | null; market_avg_experience: number | null;
    hourly_ads: number;
  };
  weekly: { week: string; n: number }[];
  open_by_day: { day: string; n: number }[];
  skills: (MixItem & { label: string })[];
  seniority: MixItem[];
  work_mode: MixItem[];
  languages: MixItem[];
  categories: KeyN[];
  towns: KeyN[];
  salary_by_seniority: {
    key: string; n: number; median: number | null; min: number | null; max: number | null;
    market_median: number | null; market_n: number | null;
  }[];
  benefit_themes: (MixItem & { label: string })[];
  benefits_top: { text: string; n: number }[];
  roles: { title: string; n: number; active: number; latest: string | null }[];
  experience: { stated: number; total: number; education_stated: number };
  ad_format: KeyN[];
  apply_channel: { own: number; cvlv: number };
  competitors: { company: string; similarity: number; shared_skills: string[]; n: number; n_active: number }[];
};
