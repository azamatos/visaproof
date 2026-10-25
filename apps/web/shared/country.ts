import type { RoleCard } from "./answers";

// One country's page: its roles and, where researched, how developers get a work permit there.
export type CountryDetail = {
  code: string;
  name: string;
  open: number;
  shown: number;
  wont: number;
  companies: number;
  salaryPosted: number;
  can: number;
  languages: { checked: number; required: number };
  rules: { rule: string; amount: number; currency: string; period: string; checkedOn: string }[];
  register: { companies: number; reviewed: number; listed: number; loadedAt: string | null } | null;
  roles: RoleCard[];
};
