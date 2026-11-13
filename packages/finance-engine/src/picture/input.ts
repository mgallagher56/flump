import type { UserProfileData } from "../profile.js";

export interface ProfileFacts {
  annualSalary: number | null;
  employmentType: "employed" | "self-employed" | "other" | null;
  taxRegion: "ENGLAND" | "WALES" | "SCOTLAND" | "NORTHERN_IRELAND" | null;
  /** [] means no student loan; null means not answered. */
  studentLoanPlans: string[] | null;
  pensionPercent: number | null;
  isSalarySacrifice: boolean | null;
}

export type FactKey = keyof ProfileFacts;

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    if (value.trim() === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  return null;
}

const REGIONS = ["ENGLAND", "WALES", "SCOTLAND", "NORTHERN_IRELAND"] as const;
const EMPLOYMENT = ["employed", "self-employed", "other"] as const;

/** Maps a stored profile to facts. Never invents a default: unanswered stays null. */
export function profileFactsFromProfile(
  profile: Partial<UserProfileData> | null | undefined,
): ProfileFacts {
  const p = profile ?? {};
  const taxRegion = REGIONS.find((r) => r === p.taxRegion) ?? null;
  const employmentType = EMPLOYMENT.find((e) => e === p.employmentType) ?? null;
  const isSalarySacrifice = typeof p.isSalarySacrifice === "boolean" ? p.isSalarySacrifice : null;
  let studentLoanPlans: string[] | null = null;
  if (Array.isArray(p.studentLoanPlans)) {
    studentLoanPlans = p.studentLoanPlans.filter((x) => typeof x === "string" && x.trim() !== "");
  } else if (typeof p.studentLoanPlan === "string" && p.studentLoanPlan.trim() !== "") {
    // Legacy single-plan column; "NONE" means the user said they have no loan.
    studentLoanPlans = p.studentLoanPlan.trim().toUpperCase() === "NONE" ? [] : [p.studentLoanPlan];
  }
  return {
    annualSalary: toNumber(p.annualSalary),
    employmentType,
    taxRegion,
    studentLoanPlans,
    pensionPercent: toNumber(p.pensionPercent),
    isSalarySacrifice,
  };
}
