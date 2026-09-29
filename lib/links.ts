/** Company names are free text (may contain "/", quotes…), so they travel as a query param. */
export const companyHref = (company: string) => `/companies/profile?name=${encodeURIComponent(company)}`;
