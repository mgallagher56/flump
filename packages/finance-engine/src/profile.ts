import type {
  ActiveModule,
  FinancialBaseline,
  FinancialStage,
  HousingStatus,
  OnboardingSeedPayload,
  UkEmploymentStatus,
  UkStudentLoanPlan,
  UkTaxRegion,
  UkTaxYear,
} from "./types.js";

export const DEFAULT_FINANCIAL_BASELINE: FinancialBaseline = {
  userId: "",
  age: 32,
  taxYear: "2025/26",
  ukRegion: "ENGLAND_NI_WALES",
  employmentStatus: "PAYE",
  annualGrossSalary: 45000,
  monthlyTakeHomeOverride: undefined,
  annualBonusOrSideIncome: 0,
  housingStatus: "RENTING",
  monthlyHousingCost: 900,
  propertyValue: 0,
  mortgageBalance: 0,
  monthlyOtherOutgoings: 1100,
  totalCashSavings: 5000,
  totalPensionPot: 15000,
  totalUnsecuredDebt: 0,
  pensionContributionPct: 5,
  employerPensionMatchPct: 3,
  isSalarySacrifice: true,
  studentLoanPlan: "NONE",
  propertyOwnershipSharePct: 100,
  financialStage: "STAGE_2_BUFFER_BUILD",
  enabledModules: ["accounts", "budget", "pension", "forecast"],
};

export interface UserProfileData {
  id?: string;
  userId?: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  currency?: string;
  country?: string;
  age?: number | null;
  /** E23 D-3-B: stored instead of age. */
  birthYear?: number | null;
  /** E23 D06: the four UK nations; null means not set. */
  taxRegion?: "ENGLAND" | "WALES" | "SCOTLAND" | "NORTHERN_IRELAND" | null;
  /** E23 D07: [] means "no student loan"; null means not answered. */
  studentLoanPlans?: string[] | null;
  employmentType?: "employed" | "self-employed" | "other" | null;
  annualSalary?: number | null;
  monthlyTakeHome?: number | null;
  studentLoanPlan?: string | null;
  hasSecondIncome?: boolean;
  secondIncomeMonthly?: number | null;
  hasRentalIncome?: boolean;
  rentalIncomeMonthly?: number | null;
  housingStatus?: "renting" | "mortgage" | "own_outright" | null;
  monthlyHousingCost?: number | null;
  monthlyOtherOutgoings?: number | null;
  totalCashSavings?: number | null;
  totalPensionPot?: number | null;
  totalUnsecuredDebt?: number | null;
  hasMortgage?: boolean;
  mortgageType?: "repayment" | "interest-only";
  mortgageRenewalDate?: string | null;
  homeValue?: number | null;
  mortgageBalance?: number | null;
  propertyOwnershipShare?: number;
  hasBuyToLet?: boolean;
  buyToLetCount?: number;
  buyToLetPropertyValue?: number | null;
  buyToLetMonthlyRental?: number | null;
  buyToLetMortgageBalance?: number | null;
  buyToLetMortgageRate?: number | null;
  buyToLetMortgageType?: "repayment" | "interest-only";
  pensionPercent?: number;
  pensionEmployerPercent?: number;
  isSalarySacrifice?: boolean;
  isSalarySacrificeEmployerNi?: boolean;
  monthlySavingsTarget?: number | null;
  savingsAllocationMode?: "total" | "per_account";
  savingsDefaultInterestRate?: number;
  setupChecklistCompletedSteps?: string[];
  enabledPages?: string[];
  dashboardWidgets?: string[];
  dashboardWidgetOrder?: string[];
  dashboardWidgetSizes?: Record<string, "normal" | "wide">;
  dashboardWidgetConfig?: Record<string, any>;
  customBudgetCategories?: string[];
  hasResetFinancialData?: boolean;
  onboardingCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type AnySeedPayload = OnboardingSeedPayload | Record<string, any>;

/**
 * Normalizes string student loan plan to canonical UkStudentLoanPlan
 */
export function normalizeStudentLoanPlan(plan?: string | null): UkStudentLoanPlan {
  if (!plan) return "NONE";
  const p = plan.toUpperCase().replace(/\s+/g, "_");
  if (p === "PLAN_1" || p === "PLAN1") return "PLAN_1";
  if (p === "PLAN_2" || p === "PLAN2") return "PLAN_2";
  if (p === "PLAN_4" || p === "PLAN4") return "PLAN_4";
  if (p === "PLAN_5" || p === "PLAN5") return "PLAN_5";
  if (p === "POSTGRAD" || p === "POSTGRADUATE") return "POSTGRAD";
  return "NONE";
}

/**
 * The engine applies one plan. A postgraduate loan repays alongside an undergraduate plan, so
 * the undergraduate plan wins until the engine sums concurrent plans (E23 D07 follow-up).
 */
function pickEnginePlan(plans: string[]): string | null {
  return plans.find((plan) => normalizeStudentLoanPlan(plan) !== "POSTGRAD") ?? plans[0] ?? null;
}

/**
 * Normalizes string employment type to canonical UkEmploymentStatus
 */
export function normalizeEmploymentStatus(
  status?: string | null,
  isSelfEmployed?: boolean,
): UkEmploymentStatus {
  if (isSelfEmployed) return "SELF_EMPLOYED";
  if (!status) return "PAYE";
  const s = status.toLowerCase();
  if (s === "self-employed" || s === "self_employed") return "SELF_EMPLOYED";
  if (s === "employed" || s === "paye") return "PAYE";
  if (s === "director") return "OTHER";
  return "OTHER";
}

/**
 * Normalizes housing status to canonical HousingStatus
 */
export function normalizeHousingStatus(status?: string | null, mortgageBalance = 0): HousingStatus {
  if (!status) return mortgageBalance > 0 ? "MORTGAGE" : "RENTING";
  const s = status.toUpperCase();
  if (s === "MORTGAGE") return "MORTGAGE";
  if (s === "OWN_OUTRIGHT" || s === "OWNOUTRIGHT" || s === "OWNED") return "OWN_OUTRIGHT";
  return "RENTING";
}

/**
 * Converts a UserProfile (or partial UserProfileData) into a FinancialBaseline.
 */
export function userProfileToFinancialBaseline(
  profile: Partial<UserProfileData>,
  fallbackUserId = "",
): FinancialBaseline {
  const mortgageBalance = Number(profile.mortgageBalance ?? 0);
  const housingStatus = normalizeHousingStatus(profile.housingStatus, mortgageBalance);
  const annualGrossSalary =
    profile.annualSalary !== null && profile.annualSalary !== undefined
      ? Number(profile.annualSalary)
      : DEFAULT_FINANCIAL_BASELINE.annualGrossSalary;
  const totalUnsecuredDebt =
    profile.totalUnsecuredDebt !== null && profile.totalUnsecuredDebt !== undefined
      ? Number(profile.totalUnsecuredDebt)
      : 0;

  // Determine stage
  let financialStage: FinancialStage;
  if (totalUnsecuredDebt > 0) {
    financialStage = "STAGE_1_DEBT_RECOVERY";
  } else if (annualGrossSalary >= 100000) {
    financialStage = "STAGE_3_WEALTH_OPTIMIZE";
  } else {
    financialStage = "STAGE_2_BUFFER_BUILD";
  }

  // Map enabled pages to enabled modules
  const rawPages = Array.isArray(profile.enabledPages)
    ? profile.enabledPages
    : DEFAULT_FINANCIAL_BASELINE.enabledModules;
  const enabledModules: ActiveModule[] = Array.from(
    new Set(
      rawPages
        .map((p) => (p === "savings" ? "accounts" : p))
        .filter((p): p is ActiveModule =>
          ["accounts", "debt", "budget", "pension", "mortgage", "forecast", "tax"].includes(p),
        ),
    ),
  );

  return {
    ...DEFAULT_FINANCIAL_BASELINE,
    userId: profile.userId ?? profile.id ?? fallbackUserId,
    ukRegion: profile.taxRegion === "SCOTLAND" ? "SCOTLAND" : "ENGLAND_NI_WALES",
    ukRegionAssumed: !profile.taxRegion,
    age:
      profile.birthYear !== null && profile.birthYear !== undefined
        ? new Date().getFullYear() - Number(profile.birthYear)
        : profile.age !== null && profile.age !== undefined
          ? Number(profile.age)
          : DEFAULT_FINANCIAL_BASELINE.age,
    employmentStatus: normalizeEmploymentStatus(profile.employmentType),
    annualGrossSalary,
    monthlyTakeHomeOverride:
      profile.monthlyTakeHome !== null && profile.monthlyTakeHome !== undefined
        ? Number(profile.monthlyTakeHome)
        : undefined,
    annualBonusOrSideIncome:
      Number(profile.secondIncomeMonthly ?? 0) * 12 + Number(profile.rentalIncomeMonthly ?? 0) * 12,
    housingStatus,
    monthlyHousingCost:
      profile.monthlyHousingCost !== null && profile.monthlyHousingCost !== undefined
        ? Number(profile.monthlyHousingCost)
        : housingStatus === "OWN_OUTRIGHT"
          ? 0
          : DEFAULT_FINANCIAL_BASELINE.monthlyHousingCost,
    propertyValue:
      profile.homeValue !== null && profile.homeValue !== undefined
        ? Number(profile.homeValue)
        : mortgageBalance > 0
          ? Math.round(mortgageBalance * 1.35)
          : 0,
    mortgageBalance,
    monthlyOtherOutgoings:
      profile.monthlyOtherOutgoings !== null && profile.monthlyOtherOutgoings !== undefined
        ? Number(profile.monthlyOtherOutgoings)
        : DEFAULT_FINANCIAL_BASELINE.monthlyOtherOutgoings,
    totalCashSavings:
      profile.totalCashSavings !== null && profile.totalCashSavings !== undefined
        ? Number(profile.totalCashSavings)
        : DEFAULT_FINANCIAL_BASELINE.totalCashSavings,
    totalPensionPot:
      profile.totalPensionPot !== null && profile.totalPensionPot !== undefined
        ? Number(profile.totalPensionPot)
        : DEFAULT_FINANCIAL_BASELINE.totalPensionPot,
    totalUnsecuredDebt,
    pensionContributionPct:
      profile.pensionPercent !== null && profile.pensionPercent !== undefined
        ? Number(profile.pensionPercent)
        : DEFAULT_FINANCIAL_BASELINE.pensionContributionPct,
    employerPensionMatchPct:
      profile.pensionEmployerPercent !== null && profile.pensionEmployerPercent !== undefined
        ? Number(profile.pensionEmployerPercent)
        : DEFAULT_FINANCIAL_BASELINE.employerPensionMatchPct,
    isSalarySacrifice: profile.isSalarySacrifice ?? DEFAULT_FINANCIAL_BASELINE.isSalarySacrifice,
    studentLoanPlan: normalizeStudentLoanPlan(
      Array.isArray(profile.studentLoanPlans)
        ? pickEnginePlan(profile.studentLoanPlans)
        : profile.studentLoanPlan,
    ),
    propertyOwnershipSharePct:
      profile.propertyOwnershipShare !== null && profile.propertyOwnershipShare !== undefined
        ? Number(profile.propertyOwnershipShare)
        : DEFAULT_FINANCIAL_BASELINE.propertyOwnershipSharePct,
    financialStage,
    enabledModules:
      enabledModules.length > 0 ? enabledModules : DEFAULT_FINANCIAL_BASELINE.enabledModules,
  };
}

/**
 * Converts a FinancialBaseline into partial UserProfileData suitable for PATCH /user-profile.
 */
export function financialBaselineToUserProfileUpdate(
  baseline: FinancialBaseline,
): Partial<UserProfileData> {
  const mortgageBalance = Number(baseline.mortgageBalance ?? 0);
  const employmentType =
    baseline.employmentStatus === "SELF_EMPLOYED"
      ? "self-employed"
      : baseline.employmentStatus === "PAYE"
        ? "employed"
        : "other";

  const housingStatus =
    baseline.housingStatus === "MORTGAGE"
      ? "mortgage"
      : baseline.housingStatus === "OWN_OUTRIGHT"
        ? "own_outright"
        : "renting";

  return {
    age: baseline.age ?? null,
    annualSalary: baseline.annualGrossSalary,
    monthlyTakeHome: baseline.monthlyTakeHomeOverride ?? null,
    employmentType,
    housingStatus,
    monthlyHousingCost: baseline.monthlyHousingCost,
    homeValue: baseline.propertyValue,
    mortgageBalance,
    hasMortgage: mortgageBalance > 0 || baseline.housingStatus === "MORTGAGE",
    monthlyOtherOutgoings: baseline.monthlyOtherOutgoings,
    totalCashSavings: baseline.totalCashSavings,
    totalPensionPot: baseline.totalPensionPot,
    totalUnsecuredDebt: baseline.totalUnsecuredDebt,
    pensionPercent: baseline.pensionContributionPct,
    pensionEmployerPercent: baseline.employerPensionMatchPct,
    isSalarySacrifice: baseline.isSalarySacrifice,
    propertyOwnershipShare: baseline.propertyOwnershipSharePct,
    studentLoanPlan: baseline.studentLoanPlan,
    enabledPages: baseline.enabledModules,
  };
}

/**
 * Hydrates a FinancialBaseline from an OnboardingSeedPayload.
 */
export function hydrateBaselineFromSeed(seed: AnySeedPayload, userId = ""): FinancialBaseline {
  const seedAny = seed as Record<string, any>;
  const annualGrossSalary =
    seedAny.annualGrossSalary ??
    seedAny.annualIncome ??
    (seedAny.mode === "WEALTH" ? 65000 : 38000);
  const pensionContributionPct = seedAny.pensionContributionPct ?? 5;
  const isSalarySacrifice = seedAny.isSalarySacrifice ?? seedAny.salarySacrifice ?? true;
  const totalUnsecuredDebt =
    seedAny.totalUnsecuredDebt !== undefined ? seedAny.totalUnsecuredDebt : 0;
  const totalCashSavings = seedAny.totalCashSavings ?? seedAny.initialCashSavings ?? 5000;
  const mortgageBalance = seedAny.mortgageBalance ?? 0;
  const propertyValue =
    seedAny.propertyValue ?? (mortgageBalance > 0 ? Math.round(mortgageBalance * 1.35) : 0);
  const housingStatus = normalizeHousingStatus(seedAny.housingStatus, mortgageBalance);
  const monthlyHousingCost =
    seedAny.monthlyHousingCost ?? (housingStatus === "OWN_OUTRIGHT" ? 0 : 900);
  const monthlyOtherOutgoings = seedAny.monthlyOtherOutgoings ?? 1100;
  const totalPensionPot = seedAny.totalPensionPot ?? seedAny.initialInvestments ?? 15000;
  const age = seedAny.age ?? 32;
  const studentLoanPlan = normalizeStudentLoanPlan(seedAny.studentLoanPlan);
  const employmentStatus = normalizeEmploymentStatus(
    seedAny.employmentStatus,
    seedAny.isSelfEmployed,
  );

  // Determine stage if not already explicitly inferred
  let stage: FinancialStage = seedAny.inferredStage as FinancialStage;
  if (!stage) {
    if (seedAny.mode === "DEBT" || totalUnsecuredDebt > 0) {
      stage = "STAGE_1_DEBT_RECOVERY";
    } else if (annualGrossSalary >= 100000) {
      stage = "STAGE_3_WEALTH_OPTIMIZE";
    } else {
      stage = "STAGE_2_BUFFER_BUILD";
    }
  }

  // Determine enabled modules (mapping legacy 'savings' -> 'accounts')
  const rawModules: string[] = Array.isArray(seedAny.inferredModules)
    ? seedAny.inferredModules
    : [];
  let enabledModules: ActiveModule[] = rawModules
    .map((m) => (m === "savings" ? "accounts" : m))
    .filter((m): m is ActiveModule =>
      ["accounts", "debt", "budget", "pension", "mortgage", "forecast", "tax"].includes(m),
    );

  // Deduplicate
  enabledModules = Array.from(new Set(enabledModules));

  if (enabledModules.length === 0) {
    enabledModules = ["accounts", "budget", "forecast"];
    if (totalUnsecuredDebt > 0 || stage === "STAGE_1_DEBT_RECOVERY") {
      enabledModules.push("debt");
    }
    if (totalPensionPot > 0 || pensionContributionPct > 0) {
      enabledModules.push("pension");
    }
    if (housingStatus === "MORTGAGE" || mortgageBalance > 0) {
      enabledModules.push("mortgage");
    }
    // Self Assessment is opt-in (E16 D3-B): inferred on only for self-employed users.
    if (employmentStatus === "SELF_EMPLOYED") {
      enabledModules.push("tax");
    }
    enabledModules = Array.from(new Set(enabledModules));
  }

  return {
    ...DEFAULT_FINANCIAL_BASELINE,
    userId,
    age,
    employmentStatus,
    annualGrossSalary,
    monthlyTakeHomeOverride: seedAny.monthlyTakeHomeOverride,
    housingStatus,
    monthlyHousingCost,
    propertyValue,
    mortgageBalance,
    monthlyOtherOutgoings,
    totalCashSavings,
    totalPensionPot,
    totalUnsecuredDebt,
    pensionContributionPct,
    isSalarySacrifice,
    studentLoanPlan,
    financialStage: stage,
    enabledModules,
  };
}

// ---------------------------------------------------------------------------
// Seed Payload Codec (Base64 URL-Safe with backward compatibility)
// ---------------------------------------------------------------------------

function utf8ToBase64(str: string): string {
  const g = globalThis as any;
  if (typeof g.Buffer !== "undefined") {
    return g.Buffer.from(str, "utf-8").toString("base64");
  }
  if (typeof btoa === "function") {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
  }
  return encodeURIComponent(str);
}

function base64ToUtf8(b64: string): string {
  const g = globalThis as any;
  if (typeof g.Buffer !== "undefined") {
    return g.Buffer.from(b64, "base64").toString("utf-8");
  }
  if (typeof atob === "function") {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }
  return decodeURIComponent(b64);
}

/**
 * Legacy XOR scramble for backward-compatibility with older saved seeds.
 */
export function scrambleSeedLegacy(str: string): string {
  const g = globalThis as any;
  try {
    const bytes = new TextEncoder().encode(str);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = (bytes[i] ?? 0) ^ 0x5f;
    }
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return typeof btoa === "function" ? btoa(binary) : g.Buffer.from(bytes).toString("base64");
  } catch {
    return utf8ToBase64(str);
  }
}

/**
 * Legacy XOR unscramble for backward-compatibility with older saved seeds.
 */
export function unscrambleSeedLegacy(b64: string): string {
  const g = globalThis as any;
  try {
    const binary =
      typeof atob === "function" ? atob(b64) : g.Buffer.from(b64, "base64").toString("binary");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i) ^ 0x5f;
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return b64;
  }
}

/**
 * Canonical URL-safe Base64 encoder for onboarding seed payload.
 */
export function encodeSeedPayload(payload: OnboardingSeedPayload | Record<string, any>): string {
  const jsonStr = JSON.stringify(payload);
  const base64 = utf8ToBase64(jsonStr);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Robust seed decoder supporting canonical URL-safe Base64, standard Base64,
 * legacy XOR-scrambled Base64, raw JSON, and URL-encoded strings.
 */
export function decodeSeedPayload(raw: string | null | undefined): OnboardingSeedPayload | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1. Try URL-encoded JSON (starts with %7B or contains %22)
  if (trimmed.startsWith("%7B") || trimmed.includes("%22")) {
    try {
      const decoded = decodeURIComponent(trimmed);
      return JSON.parse(decoded);
    } catch {
      // Continue to next attempts
    }
  }

  // 2. Try raw JSON string
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Continue
    }
  }

  // 3. Try URL-safe Base64 / Standard Base64
  const standardBase64 = trimmed.replace(/-/g, "+").replace(/_/g, "/");
  const paddedBase64 = standardBase64.padEnd(
    standardBase64.length + ((4 - (standardBase64.length % 4)) % 4),
    "=",
  );

  try {
    const utf8 = base64ToUtf8(paddedBase64);
    if (utf8.startsWith("{")) {
      return JSON.parse(utf8);
    }
  } catch {
    // Continue
  }

  // 4. Try legacy XOR unscramble
  try {
    const unscrambled = unscrambleSeedLegacy(paddedBase64);
    if (unscrambled.startsWith("{")) {
      return JSON.parse(unscrambled);
    }
  } catch {
    // Continue
  }

  return null;
}

// ---------------------------------------------------------------------------
// Profile Persistence Adapter Seam
// ---------------------------------------------------------------------------

export interface ProfilePersistenceAdapter {
  getBaseline(): Promise<FinancialBaseline | null> | FinancialBaseline | null;
  saveBaseline(baseline: FinancialBaseline): Promise<void> | void;
  getSeed(): Promise<OnboardingSeedPayload | null> | OnboardingSeedPayload | null;
  saveSeed(seed: OnboardingSeedPayload): Promise<void> | void;
  clearSeed(): Promise<void> | void;
}

export class InMemoryProfileAdapter implements ProfilePersistenceAdapter {
  private baseline: FinancialBaseline | null = null;
  private seed: OnboardingSeedPayload | null = null;

  constructor(initialBaseline?: FinancialBaseline, initialSeed?: OnboardingSeedPayload) {
    if (initialBaseline) this.baseline = { ...initialBaseline };
    if (initialSeed) this.seed = { ...initialSeed };
  }

  getBaseline(): FinancialBaseline | null {
    return this.baseline ? { ...this.baseline } : null;
  }

  saveBaseline(baseline: FinancialBaseline): void {
    this.baseline = { ...baseline };
  }

  getSeed(): OnboardingSeedPayload | null {
    return this.seed ? { ...this.seed } : null;
  }

  saveSeed(seed: OnboardingSeedPayload): void {
    this.seed = { ...seed };
  }

  clearSeed(): void {
    this.seed = null;
  }
}
