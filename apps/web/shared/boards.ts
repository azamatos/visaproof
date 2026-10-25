// The job boards the pipeline reads, as people know them, and the public page of a company's board.
export const BOARD_NAMES: Record<string, string> = {
  ashby: "Ashby",
  greenhouse: "Greenhouse",
  lever: "Lever",
  personio: "Personio",
  recruitee: "Recruitee",
  smartrecruiters: "SmartRecruiters",
  workable: "Workable",
  workday: "Workday",
};

export function boardUrl(ats: string, slug: string, eu: boolean): string | null {
  switch (ats) {
    case "ashby":
      return `https://jobs.ashbyhq.com/${slug}`;
    case "greenhouse":
      return `https://job-boards${eu ? ".eu" : ""}.greenhouse.io/${slug}`;
    case "lever":
      return `https://jobs${eu ? ".eu" : ""}.lever.co/${slug}`;
    case "personio":
      return `https://${slug}.jobs.personio.de`;
    case "recruitee":
      return `https://${slug}.recruitee.com`;
    case "smartrecruiters":
      return `https://careers.smartrecruiters.com/${slug}`;
    case "workable":
      return `https://apply.workable.com/${slug}`;
    case "workday": {
      // host/tenant/site
      const [host, , site] = slug.split("/");
      return host && site ? `https://${host}/${site}` : null;
    }
    default:
      return null;
  }
}

// A company's page: /companies/greenhouse/adyen. Workday slugs have slashes (host/tenant/site), so the path is
// the slug's parts.
export const companyPath = (ats: string, slug: string) =>
  `/companies/${ats}/${slug.split("/").map(encodeURIComponent).join("/")}`;
