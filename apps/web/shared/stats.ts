import type { VisaState } from "./answers";

// The live numbers the Method page quotes (/api/stats).
export type Stats = {
  roles: number;
  companies: number;
  boardsKnown: number;
  visa: Record<VisaState, number>;
  mentions: number;
  helps: number;
  englishOnly: number;
  languagesChecked: number;
  reviewed: number;
};
