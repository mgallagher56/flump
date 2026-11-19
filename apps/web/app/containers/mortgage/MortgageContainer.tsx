import {
  AccountListResponse,
  CreateAccountResponse,
  UpdateAccountResponse,
} from "@flump/api-contract";
import {
  BUY_TO_LET_PROPERTY_LABEL,
  categorizeAccountType,
  HOME_ESTIMATE_LABEL,
  type HomeProperty,
  isBuyToLetAccount,
  isFigureKnown,
  PortfolioSnapshot,
  pickHomeProperty,
  resolveAccountSharePercent,
  selectLoanToValue,
} from "@flump/finance-engine";
import {
  Button,
  CollapsibleDrawer,
  EmptyState,
  HeroFigure,
  KpiCard,
  KpiStrip,
  LiveRegion,
  Money,
  Num,
  PageBody,
  PageHeader,
  ProjectionNotice,
  ScenarioZone,
  Tabs,
} from "@repo/ui";
import { type FC, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useLoaderData, useNavigate, useRevalidator, useSearchParams } from "react-router";
import { BtlOverview } from "~/features/mortgage/components/BtlOverview";
import { MortgageAlerts } from "~/features/mortgage/components/MortgageAlerts";
import { MortgageEditDialog } from "~/features/mortgage/components/MortgageEditDialog";
import { MortgageScenarioInputs } from "~/features/mortgage/components/MortgageScenarioInputs";
import { MortgageSummary } from "~/features/mortgage/components/MortgageSummary";
import { MortgageTracker } from "~/features/mortgage/components/MortgageTracker";
import { OverpaymentSimulator } from "~/features/mortgage/components/OverpaymentSimulator";
import { OverpayVsSaveCompare } from "~/features/mortgage/components/OverpayVsSaveCompare";
import { RemortgageShockSim } from "~/features/mortgage/components/RemortgageShockSim";
import { isJointAccount, withWholeBalances } from "~/features/mortgage/jointMortgage";
import {
  formatIsoMonthYear,
  formatYearsLeft,
  rateFractionDigits,
} from "~/features/mortgage/mortgageFormat";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { useScenarioState } from "~/hooks/useScenarioState";
import { useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/routes/app.mortgage";
import { apiFetch, apiFetchAll } from "~/services/api-client";
import { BackendError } from "~/services/backend-error";
import { CONFLICT_MESSAGE, isConflict, versionEtag } from "~/services/conflict";
import { buildWorkspacePicture } from "~/utils/financialPicture";
import { monthlyMortgagePayment } from "~/utils/mortgagePayment";
import { roundTo2dp } from "~/utils/roundTo2dp";
import {
  pageRoot,
  partialStack,
  plainFigure,
  plainFigureLabel,
  plainFigures,
  plainFigureValue,
  promptBlock,
  promptDivider,
  promptStatus,
  promptTitle,
  savedSection,
  tabPanel,
} from "./MortgageContainer.styles";

/** The monthly payment saved on an account (its monthly contribution), or 0 when none is saved. */
const storedMonthlyPayment = (rows: readonly { id?: string }[], id: string | null): number => {
  if (!id) return 0;
  const row = rows.find((a) => a.id === id) as { monthlyContribution?: unknown } | undefined;
  const stored = Number(row?.monthlyContribution);
  return Number.isFinite(stored) && stored > 0 ? stored : 0;
};

/** Loan to value to at most 1 decimal place, trailing zero dropped: 60 -> "60%", 38.7 -> "38.7%". */
const ltvFractionDigits = (ltv: number): number =>
  Number.isInteger(Math.round(ltv * 10) / 10) ? 0 : 1;

/**
 * The term typed as years and months, in whole months (1..600), or 0 when nothing usable is typed.
 * A blank part counts as 0, so "18" years and "" months is 216 months.
 */
const typedTermMonths = (years: string, months: string): number => {
  const part = (text: string) => (text.trim() === "" ? 0 : Number(text));
  const total = Math.round(part(years) * 12 + part(months));
  return Number.isFinite(total) && total > 0 ? Math.min(600, Math.max(1, total)) : 0;
};

const formatList = (items: string[]): string =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

/** Shown when the mortgage figures were stored but the home value was not. */
export const HOME_VALUE_NOT_SAVED =
  "We saved your mortgage details but could not save your home value. Try again.";

/** Why loan to value is left out when more than one property could be the home (HM-3). */
const AMBIGUOUS_HOME_TEXT =
  "You have more than one property on Accounts, so we cannot tell which is your home.";

/** Why loan to value is left out when more than one rental could be the one this mortgage is on. */
const AMBIGUOUS_RENTAL_TEXT =
  "You have more than one rental property on Accounts, so we cannot tell which this mortgage is on.";

type RepaymentType = "repayment" | "interest-only";

/** The account row fields this page reads and the saves write. */
interface PropertyRow {
  id?: string;
  name?: string;
  type?: string;
  accountSubtype?: string | null;
  ownership?: "sole" | "joint" | null;
  sharePercent?: number | null;
  /** Mortgage accounts: the Property account the mortgage is on (system audit slice 4). */
  linkedAccountId?: string | null;
  /** Mortgage accounts: how it is repaid, or null when not saved. */
  repaymentType?: RepaymentType | null;
  interestRate?: unknown;
  termMonths?: unknown;
  updatedAt?: unknown;
}

const isPropertyRow = (row: PropertyRow): boolean => categorizeAccountType(row.type) === "property";

/**
 * The property a mortgage is on: the one it is linked to, else (residential) the home that
 * `pickHomeProperty` finds, so a rental is never the home, or (buy to let) the one rental property
 * no other mortgage is linked to. More than one candidate is ambiguous, and nothing is offered or
 * written (HM-3, HM-4).
 */
export const propertyForMortgage = (
  rows: readonly PropertyRow[],
  mortgage: PropertyRow | null,
  category: "residential" | "btl",
): HomeProperty<PropertyRow> => {
  const withId = rows.filter((row) => !!row.id);
  const linkedId = mortgage?.linkedAccountId;
  const linked = linkedId
    ? withId.find((row) => row.id === linkedId && isPropertyRow(row))
    : undefined;
  if (category === "btl") {
    if (linked) return { status: "one", account: linked };
    const taken = new Set(
      withId
        .filter((row) => row.id !== mortgage?.id && !!row.linkedAccountId)
        .map((row) => row.linkedAccountId),
    );
    const free = withId.filter(
      (row) => isPropertyRow(row) && isBuyToLetAccount(row) && !taken.has(row.id),
    );
    if (free.length === 0) return { status: "none" };
    if (free.length === 1) return { status: "one", account: free[0] as PropertyRow };
    return { status: "ambiguous", accounts: free };
  }
  if (linked && !isBuyToLetAccount(linked)) return { status: "one", account: linked };
  return pickHomeProperty(withId);
};

type ScenarioTool = "overpayment" | "rate-change" | "overpay-vs-save";
type PropertyCategory = "residential" | "btl";

const SCENARIO_TOOLS = [
  { value: "overpayment", label: "Overpay" },
  { value: "rate-change", label: "Rate change" },
  { value: "overpay-vs-save", label: "Overpay or save" },
] as const;

const CATEGORY_TABS = [
  { value: "residential", label: "Residential" },
  { value: "btl", label: "Buy to let" },
] as const;

const isScenarioTool = (value: string | null): value is ScenarioTool =>
  SCENARIO_TOOLS.some((tool) => tool.value === value);

const SCENARIO_ZONE_ID = "mortgage-scenario";

/** The rate in the closed zone summary: up to 2 decimals, en-GB. */
const YEARS_AND_RATE = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

const scrollToId = (id: string) => {
  document.getElementById(id)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
};

const longDate = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

type SnapshotAccounts = ConstructorParameters<typeof PortfolioSnapshot>[0];
type SnapshotDetails = ConstructorParameters<typeof PortfolioSnapshot>[1];
type MortgageRow = { id?: unknown; interestRate?: unknown; termMonths?: unknown };

/**
 * One mortgage account's saved figures, read from the whole-loan rows: each is null when it is not
 * saved (not above 0), so the caller decides what an unsaved figure falls back to. `row` defaults
 * to the account whose id is `id`. Nothing is assumed and nothing is written.
 */
const savedMortgageFigures = (
  accounts: SnapshotAccounts,
  accountDetails: SnapshotDetails,
  id: string,
  row: MortgageRow | undefined = (accounts as unknown as readonly MortgageRow[]).find(
    (a) => a.id === id,
  ),
): { balance: number | null; rate: number | null; termYears: number | null } => {
  const balance = new PortfolioSnapshot(
    withWholeBalances(accounts),
    accountDetails,
  ).getLatestBalance(id);
  const rate = Number(row?.interestRate);
  const termMonths = Number(row?.termMonths);
  return {
    balance: balance > 0 ? balance : null,
    rate: rate > 0 ? rate : null,
    termYears: termMonths > 0 ? termMonths / 12 : null,
  };
};

/**
 * The first residential mortgage account and its saved figures, read as the account effect in the
 * page reads them (savedMortgageFigures): a balance, rate or term that is not saved stays at its
 * fallback (the profile balance, or 0 for empty).
 */
export const firstResidentialFigures = (
  accounts: SnapshotAccounts,
  accountDetails: SnapshotDetails,
  profileBalance: number,
): {
  accountId: string | null;
  loanAmount: number;
  interestRate: number;
  remainingTerm: number;
} => {
  const rows = accounts as unknown as ReadonlyArray<
    MortgageRow & { type?: string; name?: string | null; accountSubtype?: string | null }
  >;
  const first = rows.find((a) => a.type === "Mortgage" && !isBuyToLetAccount(a) && !!a.id);
  if (!first) {
    return { accountId: null, loanAmount: profileBalance, interestRate: 0, remainingTerm: 0 };
  }
  const id = String(first.id);
  const saved = savedMortgageFigures(accounts, accountDetails, id, first);
  return {
    accountId: id,
    loanAmount: saved.balance ?? profileBalance,
    interestRate: saved.rate ?? 0,
    remainingTerm: saved.termYears ?? 0,
  };
};

const MortgageContainer: FC = () => {
  const { accounts = [], accountDetails = [], userProfile } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, setProfile, updateProfile } = useUserProfile();
  const revalidator = useRevalidator();
  const { formatCurrency } = useFormatCurrency();

  // Sync profile from loader into atom. Until it has synced, the loader's profile is the source.
  const [profileSynced, setProfileSynced] = useState(false);
  useEffect(() => {
    if (userProfile) setProfile(userProfile);
    setProfileSynced(true);
  }, [userProfile, setProfile]);

  const profileFacts = (
    profileSynced ? profile : { ...profile, ...(userProfile ?? {}) }
  ) as typeof profile;

  const [propertyCategory, setPropertyCategory] = useState<PropertyCategory>("residential");
  const isBtl = propertyCategory === "btl";

  // SAVED mortgage figures. Only the loader data and a successful save write these: the scenario
  // zone below has its own in-memory copy, so nothing a slider does can change what is shown here.
  // Unknown values start at 0 (empty): nothing is assumed, and the page prompts for them.
  // The first residential mortgage account's saved figures are read in the first render, as the
  // account effects below would read them a render later, so the hero, chart and scenario zone do
  // not appear after the page has drawn (P61, layout shift). Read only.
  const [initialFigures] = useState(() =>
    firstResidentialFigures(accounts, accountDetails, userProfile?.mortgageBalance ?? 0),
  );
  const [loanAmount, setLoanAmount] = useState<number>(initialFigures.loanAmount);
  const [interestRate, setInterestRate] = useState<number>(initialFigures.interestRate);
  const [remainingTerm, setRemainingTerm] = useState<number>(initialFigures.remainingTerm);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editLoanAmount, setEditLoanAmount] = useState<number>(userProfile?.mortgageBalance ?? 0);
  // Held as strings so a cleared field stays empty instead of showing 0.
  const [editInterestRate, setEditInterestRate] = useState("");
  const [editTermYears, setEditTermYears] = useState("");
  const [editTermMonths, setEditTermMonths] = useState("");
  // Prefills the term fields from a term in years (stored as whole months), empty when unset.
  const setEditTerm = (termYears: number) => {
    const total = termYears > 0 ? Math.round(termYears * 12) : 0;
    setEditTermYears(total > 0 ? String(Math.floor(total / 12)) : "");
    setEditTermMonths(total > 0 ? String(total % 12) : "");
  };
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editMortgageType, setEditMortgageType] = useState<"repayment" | "interest-only">(
    userProfile?.mortgageType || "repayment",
  );
  const [editFixEndDate, setEditFixEndDate] = useState("");
  // Only a date the user changed in this form is sent, so switching accounts or reseeding the form
  // can never clear a stored fixed rate end date.
  const [editFixEndTouched, setEditFixEndTouched] = useState(false);
  // The monthly payment typed in the form; sent only when it differs from the stored one.
  const [editMonthlyPayment, setEditMonthlyPayment] = useState<number | null>(null);
  // The home value typed in the form; sent only when it differs from the stored one.
  const [editHomeValue, setEditHomeValue] = useState<number | null>(null);
  // Account fields saved on this page, laid over the loader rows until the next load, so the
  // picture below reads what was just stored.
  const [accountPatches, setAccountPatches] = useState<Record<string, Record<string, unknown>>>({});
  // True while the edit dialog's save is being sent.
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  // Synced account state
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    initialFigures.accountId,
  );

  // The one financial picture (E23/E32): fix-end dates are read from it, never recomputed here.
  // Built from saved rows plus what this page has just saved.
  const pictureAccounts = useMemo(
    () =>
      accounts.map((account: { id?: string }) =>
        account.id && accountPatches[account.id]
          ? { ...account, ...accountPatches[account.id] }
          : account,
      ),
    [accounts, accountPatches],
  );
  const picture = useMemo(
    () =>
      buildWorkspacePicture({
        userProfile: userProfile
          ? { ...userProfile, mortgageType: profile.mortgageType ?? userProfile.mortgageType }
          : userProfile,
        accounts: pictureAccounts,
        accountDetails,
      }),
    [userProfile, profile.mortgageType, pictureAccounts, accountDetails],
  );
  const selectedFixEnd = selectedAccountId
    ? (picture.fixedRateEnds.find((fact) => fact.accountId === selectedAccountId) ?? null)
    : null;
  const selectedFixEndDate = selectedFixEnd?.date ?? null;

  // The payment the user saved on the selected residential mortgage account (stored as the
  // account's monthly contribution). A saved fact, so it can be the hero (ruling D2). Read from
  // the patched rows, so a payment saved on this page shows at once.
  const storedPayment = useMemo(() => {
    if (propertyCategory === "btl" || !selectedAccountId) return 0;
    return storedMonthlyPayment(pictureAccounts, selectedAccountId);
  }, [pictureAccounts, selectedAccountId, propertyCategory]);

  // Mortgage accounts by kind, from the patched rows so a link or type saved here shows at once.
  // Buy-to-let mortgages are left out of the residential view, and the buy to let tab reads only
  // them: never the old profile copy (HM-4, DB-1).
  const mortgageAccounts = useMemo(
    () =>
      (pictureAccounts as any[]).filter(
        (acc: any) => acc.type === "Mortgage" && !isBuyToLetAccount(acc),
      ),
    [pictureAccounts],
  );
  const btlMortgageAccounts = useMemo(
    () =>
      (pictureAccounts as any[]).filter(
        (acc: any) => acc.type === "Mortgage" && isBuyToLetAccount(acc),
      ),
    [pictureAccounts],
  );
  // The properties the user lets, saved on Accounts.
  const rentalProperties = useMemo(
    () =>
      (pictureAccounts as PropertyRow[]).filter(
        (row) => !!row.id && isPropertyRow(row) && isBuyToLetAccount(row),
      ),
    [pictureAccounts],
  );
  const categoryAccounts = isBtl ? btlMortgageAccounts : mortgageAccounts;

  const selectedMortgageRow = selectedAccountId
    ? ((pictureAccounts as PropertyRow[]).find((a) => a.id === selectedAccountId) ?? null)
    : null;

  // The property the selected mortgage is on: where the value the edit form offers is stored.
  // With more than one candidate it is ambiguous, so nothing is offered or written.
  const propertyChoice = useMemo(
    () =>
      propertyForMortgage(pictureAccounts as PropertyRow[], selectedMortgageRow, propertyCategory),
    [pictureAccounts, selectedMortgageRow, propertyCategory],
  );
  const homeRow = propertyChoice.status === "one" ? propertyChoice.account : null;
  const homeAmbiguous = propertyChoice.status === "ambiguous";
  // Its saved whole value, from the same rows as the picture, so a value saved here shows at once.
  const savedPropertyValue = useMemo(() => {
    if (!homeRow) return 0;
    const snapshot = new PortfolioSnapshot(withWholeBalances(pictureAccounts), accountDetails);
    return Math.max(0, snapshot.getLatestBalance(String(homeRow.id)));
  }, [homeRow, pictureAccounts, accountDetails]);
  // The user's share of the selected mortgage when it is joint, else null (held solely).
  const mortgageSharePercent = isJointAccount(selectedMortgageRow)
    ? resolveAccountSharePercent(selectedMortgageRow)
    : null;
  // The user's share of the property, for equity: its own share when it is joint. With no
  // property yet, a typed value is saved at the mortgage's share, so the equity line uses that.
  const homeSharePercent = homeRow
    ? isJointAccount(homeRow)
      ? resolveAccountSharePercent(homeRow)
      : null
    : mortgageSharePercent;

  // How the selected mortgage is repaid: saved on the account. Only when the account has none
  // saved does a residential mortgage show the older profile answer; buy to let shows
  // interest-only, as before.
  const mortgageType: RepaymentType =
    selectedMortgageRow?.repaymentType ??
    (isBtl ? "interest-only" : (profileFacts.mortgageType ?? "repayment"));

  // What can be stored: a mortgage account holds balance and rate, and a residential one also
  // its term, fixed rate end and payment. Anything else would only be held in memory, so the
  // edit form does not offer it.
  const canSaveFigures = !!selectedAccountId;
  const canSaveTerm = !isBtl && !!selectedAccountId;

  // Scenario state: seeded from the saved figures above, in memory only (no storage, no network,
  // no money in the URL).
  // Buy to let keeps no term on the profile, so the what-if tools start from the term saved on the
  // one buy-to-let mortgage account when there is exactly one (P40). Read only: nothing is written.
  const btlAccountTerm = useMemo(() => {
    const btlMortgages = (
      accounts as Array<{
        type?: string;
        name?: string | null;
        accountSubtype?: string | null;
        termMonths?: unknown;
      }>
    ).filter((a) => a.type === "Mortgage" && isBuyToLetAccount(a));
    const termMonths = btlMortgages.length === 1 ? Number(btlMortgages[0]?.termMonths) : 0;
    return termMonths > 0 ? termMonths / 12 : 0;
  }, [accounts]);
  const savedFigures = useMemo(
    () => ({
      loanAmount,
      interestRate,
      remainingTerm:
        propertyCategory === "btl" && remainingTerm <= 0 ? btlAccountTerm : remainingTerm,
      overpayment: 0,
    }),
    [loanAmount, interestRate, remainingTerm, propertyCategory, btlAccountTerm],
  );
  const scenario = useScenarioState(savedFigures);
  const [scenarioTool, setScenarioTool] = useState<ScenarioTool>("overpayment");
  // The zone starts closed below the saved figures (UX S11); a "Model this" link opens it.
  const [scenarioOpen, setScenarioOpen] = useState(false);

  const openScenarioTool = (tool: ScenarioTool) => {
    setScenarioTool(tool);
    setScenarioOpen(true);
    scrollToId(SCENARIO_ZONE_ID);
  };

  const startEditing = () => {
    setEditLoanAmount(loanAmount);
    setEditInterestRate(interestRate > 0 ? String(interestRate) : "");
    setEditTerm(remainingTerm);
    setSaveError(null);
    setEditMortgageType(mortgageType);
    setEditFixEndDate(selectedFixEndDate ?? "");
    setEditFixEndTouched(false);
    setEditMonthlyPayment(storedPayment > 0 ? storedPayment : null);
    setEditHomeValue(savedPropertyValue > 0 ? savedPropertyValue : null);
    setIsEditing(true);
  };

  const handleSaveMortgageDetails = async () => {
    // One save at a time: a second click while one is being sent does nothing (the ref catches a
    // click before the disabled Save button has rendered).
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await saveMortgageDetails();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const saveMortgageDetails = async () => {
    const rate = Math.max(0, Number(editInterestRate));
    // Term is stored in whole months (1..600), so clamp once and show what is stored.
    const termMonths = typedTermMonths(editTermYears, editTermMonths);
    const term = termMonths / 12;
    setSaveError(null);
    const saved: string[] = [];
    // What this save stores, applied to the saved figures only once the request has succeeded.
    const next = { loanAmount, interestRate, remainingTerm };
    // A typed property value above 0; an emptied field never clears or deletes a stored value.
    // Rounded to pence, as the API takes money to 2 decimal places.
    const typedHome =
      editHomeValue !== null && editHomeValue > 0 ? roundTo2dp(editHomeValue) : null;
    let propertySaved = false;
    // Set once the mortgage figures are stored, so a failed property value save says what was kept.
    let mortgageStored = false;
    // The Property account this save wrote to, so a refused write drops its stale copy.
    let propertyIdTouched: string | null = null;
    // The mortgage account's version: the loader's, or the one its last save returned.
    let mortgageVersion: unknown = selectedMortgageRow?.updatedAt;
    const patchProperty = async (property: PropertyRow & { id: string }, balance: number) => {
      const propertyId = property.id;
      propertyIdTouched = propertyId;
      const updated = await apiFetch(`/accounts/${propertyId}`, {
        method: "PATCH",
        body: { balance },
        schema: UpdateAccountResponse,
        ifMatch: versionEtag(property.updatedAt),
      });
      setAccountPatches((prev) => ({
        ...prev,
        [propertyId]: { ...prev[propertyId], balance, updatedAt: updated.updatedAt },
      }));
    };
    try {
      // Housing cost still reads the profile's repayment type, so the residential view keeps it
      // in step with the account until the engine reads the account's own.
      if (!isBtl) await updateProfile({ hasMortgage: true, mortgageType: editMortgageType });
      if (selectedAccountId) {
        // The proxy adds the session; the browser never holds a token. Term is stored in
        // months, and the balance on a liability account is stored as a negative figure. Only
        // what differs from the saved account is sent.
        const body: {
          balance?: number;
          interestRate?: number;
          termMonths?: number;
          fixedRateEndDate?: string | null;
          monthlyContribution?: number | null;
          repaymentType?: RepaymentType;
        } = {};
        const storedRate = Number(selectedMortgageRow?.interestRate) || 0;
        const storedTermMonths = Number(selectedMortgageRow?.termMonths) || 0;
        if (editLoanAmount > 0 && editLoanAmount !== loanAmount) body.balance = -editLoanAmount;
        if (rate > 0 && rate !== storedRate) body.interestRate = rate;
        if (canSaveTerm && termMonths > 0 && termMonths !== storedTermMonths) {
          body.termMonths = termMonths;
        }
        // An emptied date clears the stored one.
        const fixEnd = editFixEndDate.trim() === "" ? null : editFixEndDate.trim();
        if (canSaveTerm && editFixEndTouched && fixEnd !== (selectedFixEndDate ?? null)) {
          body.fixedRateEndDate = fixEnd;
        }
        // An emptied payment clears the stored one; an unchanged one is not sent.
        const payment =
          editMonthlyPayment !== null && editMonthlyPayment > 0 ? editMonthlyPayment : null;
        if (canSaveTerm && payment !== (storedPayment > 0 ? storedPayment : null)) {
          body.monthlyContribution = payment;
        }
        // The repayment type is stored on the account, and sent only when the user changed it:
        // the form opens on the saved type, or on a stand-in when none is saved, and a stand-in
        // the user did not touch is not an answer.
        if (editMortgageType !== mortgageType) {
          body.repaymentType = editMortgageType;
        }
        if (Object.keys(body).length > 0) {
          const accountId = selectedAccountId;
          const updated = await apiFetch(`/accounts/${accountId}`, {
            method: "PATCH",
            body,
            schema: UpdateAccountResponse,
            ifMatch: versionEtag(mortgageVersion),
          });
          mortgageVersion = updated.updatedAt;
          setAccountPatches((prev) => ({
            ...prev,
            [accountId]: { ...prev[accountId], ...body, updatedAt: updated.updatedAt },
          }));
        }
        if (body.repaymentType !== undefined) saved.push("repayment type");
        if (body.balance !== undefined) {
          next.loanAmount = editLoanAmount;
          saved.push("balance");
        }
        if (body.interestRate !== undefined) {
          next.interestRate = rate;
          saved.push("interest rate");
        }
        if (body.termMonths !== undefined) {
          next.remainingTerm = term;
          saved.push("term");
        }
        if (body.fixedRateEndDate !== undefined) saved.push("fixed rate end date");
        if (body.monthlyContribution !== undefined) saved.push("monthly payment");
      }
      mortgageStored = true;
      // The property value is stored on a Property account. With two or more candidates the form
      // does not offer it (no way to tell which to change).
      if (!homeAmbiguous && typedHome !== null && typedHome !== savedPropertyValue) {
        if (homeRow?.id) {
          await patchProperty({ ...homeRow, id: homeRow.id }, typedHome);
          propertySaved = true;
        } else if (selectedAccountId) {
          const mortgageId = selectedAccountId;
          // Residential: ask the backend first, so a home added since this page loaded (another
          // tab, or this dialog reopened before the reload) is updated rather than added twice.
          let existing: HomeProperty<PropertyRow> = { status: "none" };
          if (!isBtl) {
            const current = (await apiFetchAll("/accounts", {
              schema: AccountListResponse,
            })) as PropertyRow[];
            existing = pickHomeProperty(current.filter((a) => !!a.id));
          }
          if (existing.status === "one" && existing.account.id) {
            await patchProperty({ ...existing.account, id: existing.account.id }, typedHome);
            propertySaved = true;
          } else if (existing.status === "none") {
            // The mortgage exists already, so the property is added on its own and then linked
            // to it. It takes the mortgage's ownership and share, so net worth never counts a
            // whole property against half a mortgage, and its kind follows the mortgage's.
            const joint = mortgageSharePercent !== null;
            const created = await apiFetch("/accounts", {
              method: "POST",
              body: {
                name: isBtl ? BUY_TO_LET_PROPERTY_LABEL : HOME_ESTIMATE_LABEL,
                type: "Property",
                accountSubtype: isBtl ? "rental" : "home",
                balance: typedHome,
                ownership: joint ? "joint" : "sole",
                ...(joint ? { sharePercent: mortgageSharePercent } : {}),
              },
              schema: CreateAccountResponse,
            });
            propertySaved = true;
            try {
              const linked = await apiFetch(`/accounts/${mortgageId}`, {
                method: "PATCH",
                body: { linkedAccountId: created.id },
                schema: UpdateAccountResponse,
                ifMatch: versionEtag(mortgageVersion),
              });
              setAccountPatches((prev) => ({
                ...prev,
                [mortgageId]: {
                  ...prev[mortgageId],
                  linkedAccountId: created.id,
                  updatedAt: linked.updatedAt,
                },
              }));
            } catch (linkErr) {
              // The property is saved and is still found as the only candidate; only the link
              // is missing, and the reload below shows the saved rows.
              console.error("Failed to link the property to the mortgage:", linkErr);
            }
          }
        }
        // Two possible homes found at save time: neither is written.
        if (propertySaved) saved.push(isBtl ? "property value" : "home value");
      }
      // Reload the saved rows so loan to value and equity read the stored property value.
      if (propertySaved) revalidator.revalidate();
      setLoanAmount(next.loanAmount);
      setInterestRate(next.interestRate);
      setRemainingTerm(next.remainingTerm);
      setSavedAt(new Date().toISOString());
      setSaveMessage(saved.length > 0 ? `Saved ${formatList(saved)}` : "No changes to save");
      setIsEditing(false);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error("Failed to save mortgage details:", err);
      setSaveMessage(null);
      if (mortgageStored) {
        // The mortgage figures were stored before the property value failed: reload them, keep
        // the form. A refused property write (changed somewhere else) also drops its stale copy.
        const homeId = propertyIdTouched as string | null;
        if (isConflict(err) && homeId) {
          setAccountPatches((prev) => {
            const { [homeId]: _dropped, ...rest } = prev;
            return rest;
          });
        }
        revalidator.revalidate();
        // What did save shows at once, so the figures never read as before the save.
        setLoanAmount(next.loanAmount);
        setInterestRate(next.interestRate);
        setRemainingTerm(next.remainingTerm);
        setSaveError(HOME_VALUE_NOT_SAVED);
        return;
      }
      if (isConflict(err)) {
        // Changed somewhere else: drop this page's copy of the account and reload the saved one.
        // The edit dialog stays open with what was typed.
        if (selectedAccountId) {
          const accountId = selectedAccountId;
          setAccountPatches((prev) => {
            const { [accountId]: _dropped, ...rest } = prev;
            return rest;
          });
        }
        revalidator.revalidate();
        // A refused profile save has already said so in a toast (useUserProfile): once is enough.
        const fromProfile = err instanceof BackendError && err.endpoint === "/user-profile";
        setSaveError(fromProfile ? null : CONFLICT_MESSAGE);
        return;
      }
      setSaveError("We could not save your mortgage details. Nothing has changed. Try again.");
    }
  };

  const currentMonthlyPayment = useMemo(
    () => monthlyMortgagePayment(loanAmount, interestRate, remainingTerm, mortgageType),
    [loanAmount, interestRate, remainingTerm, mortgageType],
  );

  // Buy to let never asks for years left: many are interest-only.
  const missingMortgageDetails = [
    loanAmount > 0 ? null : "balance",
    interestRate > 0 ? null : "interest rate",
    remainingTerm > 0 || isBtl ? null : "years left",
  ].filter((x): x is string => x !== null);
  const isComplete = missingMortgageDetails.length === 0;

  // ?tool= opens a what-if tool once the zone is on the page (it is hidden until the figures it
  // needs are saved).
  const toolParam = searchParams.get("tool");
  const handledToolParam = useRef<string | null>(null);
  useEffect(() => {
    if (!isComplete || !isScenarioTool(toolParam) || handledToolParam.current === toolParam) return;
    handledToolParam.current = toolParam;
    setScenarioTool(toolParam);
    setScenarioOpen(true);
    scrollToId(SCENARIO_ZONE_ID);
  }, [toolParam, isComplete]);

  // Property value is only ever what the user entered; it is never derived from the loan.
  // Residential loan to value (E16 PR 3): the selected residential mortgage over residential
  // Property accounts (the seeded home estimate is one), buy to let left out. Built from the
  // same rows as the picture, so a saved balance (accountPatches) is never stale. Whole loan over
  // whole property value (E34): a share of either side would misstate it.
  const residentialLtvFigure = useMemo(
    () =>
      selectLoanToValue(new PortfolioSnapshot(withWholeBalances(pictureAccounts), accountDetails), {
        mortgageAccountId: selectedAccountId,
      }),
    [pictureAccounts, accountDetails, selectedAccountId],
  );
  const residentialLtv = isFigureKnown(residentialLtvFigure) ? residentialLtvFigure.value : null;
  // Buy to let: the whole mortgage over the whole value of the rental it is on.
  const propertyValue = isBtl ? savedPropertyValue : (residentialLtv?.homeValue ?? 0);
  const ltvLoan = isBtl ? loanAmount : (residentialLtv?.mortgageBalance ?? 0);

  const hasLtvData = ltvLoan > 0 && propertyValue > 0;
  const currentLtv = !hasLtvData
    ? 0
    : !isBtl && residentialLtv
      ? residentialLtv.percent
      : (ltvLoan / propertyValue) * 100;

  // The selected account's stored fix-end date, from the picture. Shown as a fact within six
  // months of the end, and once it has ended.
  const refinanceWarning =
    !isBtl && selectedFixEnd && (selectedFixEnd.ended || selectedFixEnd.monthsRemaining <= 6)
      ? {
          diffMonths: selectedFixEnd.monthsRemaining,
          ended: selectedFixEnd.ended,
          date: selectedFixEnd.date,
        }
      : null;

  // Residential or buy to let tabs show only when the user has both (E16 PR 6).
  const hasResidential =
    mortgageAccounts.length > 0 ||
    !!profileFacts.hasMortgage ||
    profileFacts.housingStatus === "mortgage";
  // Buy to let comes from Accounts only: a buy-to-let mortgage or a rental property.
  const hasBtl = btlMortgageAccounts.length > 0 || rentalProperties.length > 0;
  const showCategoryTabs = hasResidential && hasBtl;

  // Read the stored figures for one mortgage account. Unset values stay empty (0). The balance
  // is the whole loan (E34), so the payment, the simulator and a save all work on what is owed.
  // Read from the patched rows, so a figure saved on this page shows (CS-1).
  const accountFigures = (id: string) => {
    const account = (pictureAccounts as any[]).find((a: any) => a.id === id);
    const balance = new PortfolioSnapshot(
      withWholeBalances(pictureAccounts),
      accountDetails,
    ).getLatestBalance(id);
    const rate = Number(account?.interestRate);
    const termMonths = Number(account?.termMonths);
    return {
      balance: Math.max(balance || 0, 0),
      rate: Math.max(rate || 0, 0),
      term: termMonths > 0 ? termMonths / 12 : 0,
    };
  };

  // Pre-populate with the first mortgage account of the shown kind.
  useEffect(() => {
    if (categoryAccounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(categoryAccounts[0].id);
    }
  }, [categoryAccounts, selectedAccountId]);

  // Handle account selection. Reads the patched rows, so a figure saved on this page is never
  // replaced by the loader copy from before the save (CS-1).
  useEffect(() => {
    if (selectedAccountId) {
      // A stored balance, rate or term is real data; an unset one leaves the figure as it is.
      const saved = savedMortgageFigures(pictureAccounts, accountDetails, selectedAccountId);
      if (saved.balance !== null) setLoanAmount(saved.balance);
      if (saved.rate !== null) setInterestRate(saved.rate);
      if (saved.termYears !== null) setRemainingTerm(saved.termYears);
    }
  }, [selectedAccountId, pictureAccounts, accountDetails]);

  // Choosing the account in the edit dialog reads that account's stored figures into the page
  // and the form. The choice itself is not stored.
  const selectAccount = (id: string | null) => {
    setSelectedAccountId(id);
    scenario.reset();
    const figures = id ? accountFigures(id) : { balance: 0, rate: 0, term: 0 };
    setLoanAmount(figures.balance);
    setInterestRate(figures.rate);
    setRemainingTerm(figures.term);
    setEditLoanAmount(figures.balance);
    setEditInterestRate(figures.rate > 0 ? String(figures.rate) : "");
    setEditTerm(figures.term);
    const fixEnd = id
      ? picture.fixedRateEnds.find((fact) => fact.accountId === id)?.date
      : undefined;
    setEditFixEndDate(fixEnd ?? "");
    setEditFixEndTouched(false);
    const payment = storedMonthlyPayment(pictureAccounts, id);
    setEditMonthlyPayment(payment > 0 ? payment : null);
  };

  const switchToCategory = (cat: PropertyCategory) => {
    setPropertyCategory(cat);
    setIsEditing(false);
    setSavedAt(null);
    scenario.reset();
    // Each tab reads its own mortgage accounts: buy to let never reads the profile (HM-4).
    const first = (cat === "btl" ? btlMortgageAccounts : mortgageAccounts)[0]?.id ?? null;
    setSelectedAccountId(first);
    const figures = first ? accountFigures(first) : { balance: 0, rate: 0, term: 0 };
    setLoanAmount(figures.balance);
    setInterestRate(figures.rate);
    setRemainingTerm(figures.term);
  };

  // A user with only a buy to let mortgage lands on it, since no tabs are shown.
  const openedBtl = useRef(false);
  useEffect(() => {
    if (openedBtl.current || hasResidential || !hasBtl) return;
    openedBtl.current = true;
    switchToCategory("btl");
  });

  // Headline outcome only; empty (nothing announced) until balance, rate and term are all known.
  const mortgageHeadline =
    isComplete && (storedPayment > 0 || currentMonthlyPayment > 0)
      ? `Monthly mortgage payment ${formatCurrency(storedPayment > 0 ? storedPayment : currentMonthlyPayment)}`
      : "";

  // The rental properties listed in the buy to let overview, by name.
  const btlProperties = rentalProperties.map((row) => ({
    id: String(row.id),
    name: row.name?.trim() ? row.name : BUY_TO_LET_PROPERTY_LABEL,
  }));

  const editTermTotal = typedTermMonths(editTermYears, editTermMonths);
  const editPayment =
    editLoanAmount > 0 && Number(editInterestRate) > 0 && editTermTotal > 0
      ? monthlyMortgagePayment(
          editLoanAmount,
          Number(editInterestRate),
          editTermTotal / 12,
          editMortgageType,
        )
      : null;
  const knownMonthlyPayment = currentMonthlyPayment > 0 ? currentMonthlyPayment : null;
  // The one payment figure on the page: the saved payment, else the estimate.
  const pagePayment = storedPayment > 0 ? storedPayment : knownMonthlyPayment;

  // "Last updated" for the Saved line: this session's save, else the newest stored month for the
  // linked account, else when the profile was last changed.
  const lastUpdated = useMemo(() => {
    const fromSave = longDate(savedAt);
    if (fromSave) return `Last updated ${fromSave}`;
    if (selectedAccountId) {
      const rows = accountDetails.filter((row: any) => String(row.accountId) === selectedAccountId);
      const latest = rows.reduce(
        (best: any, row: any) =>
          !best || row.year * 12 + row.month > best.year * 12 + best.month ? row : best,
        null,
      );
      if (latest) {
        const month = new Date(latest.year, latest.month - 1, 1).toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        });
        return `Last updated ${month}`;
      }
    }
    const fromProfile = longDate((userProfile as { updatedAt?: string } | undefined)?.updatedAt);
    return fromProfile ? `Last updated ${fromProfile}` : null;
  }, [savedAt, selectedAccountId, accountDetails, userProfile]);

  // Scenario outputs. These read scenario values only, and nothing above reads them.
  const scenarioValues = scenario.values;
  // The rate-change tool starts from the saved payment only while the scenario's balance, rate
  // and term are still the saved ones; once any moves, both of its figures come from the formula.
  const scenarioMatchesSaved =
    scenarioValues.loanAmount === loanAmount &&
    scenarioValues.interestRate === interestRate &&
    scenarioValues.remainingTerm === remainingTerm;
  const scenarioPayment = monthlyMortgagePayment(
    scenarioValues.loanAmount,
    scenarioValues.interestRate,
    scenarioValues.remainingTerm,
    mortgageType,
  );
  const scenarioAnnouncement =
    scenario.isModified && scenarioPayment > 0
      ? `Monthly payment ${formatCurrency(scenarioPayment + scenarioValues.overpayment)}${
          scenarioValues.overpayment > 0
            ? `, including ${formatCurrency(scenarioValues.overpayment)} extra a month`
            : ""
        }`
      : "";

  const selectedAccount = selectedAccountId
    ? categoryAccounts.find((acc: any) => acc.id === selectedAccountId)
    : null;
  // The page shows the whole loan; net worth elsewhere counts the user's share (E34).
  const jointBalanceNote = isJointAccount(selectedAccount) ? "Whole loan, held jointly" : undefined;

  // Two or more possible properties: the value comes from Accounts, where each one is kept.
  const homeFromAccounts = homeAmbiguous;
  // Saved property value for the equity row in "Your details": shown only when one is known.
  const savedHomeValue = savedPropertyValue;

  const editDialog = (
    <MortgageEditDialog
      canSaveFigures={canSaveFigures}
      canSaveTerm={canSaveTerm}
      editFixEndDate={editFixEndDate}
      editInterestRate={editInterestRate}
      editLoanAmount={editLoanAmount}
      editMortgageType={editMortgageType}
      editPayment={editPayment}
      editTermMonths={editTermMonths}
      editTermYears={editTermYears}
      mortgageAccounts={categoryAccounts}
      open={isEditing}
      propertyCategory={propertyCategory}
      saveError={saveError}
      selectedAccountId={selectedAccountId}
      onAddAccount={() => navigate("/app/accounts")}
      onEditFixEndDateChange={(value) => {
        setEditFixEndDate(value);
        setEditFixEndTouched(true);
      }}
      onEditInterestRateChange={setEditInterestRate}
      editMonthlyPayment={editMonthlyPayment}
      editHomeValue={homeFromAccounts ? null : editHomeValue}
      homeSharePercent={homeSharePercent}
      mortgageSharePercent={mortgageSharePercent}
      homeValueMode={homeFromAccounts ? "fromAccounts" : "input"}
      onEditHomeValueChange={setEditHomeValue}
      onEditLoanAmountChange={setEditLoanAmount}
      onEditMonthlyPaymentChange={setEditMonthlyPayment}
      onEditMortgageTypeChange={setEditMortgageType}
      onEditTermMonthsChange={setEditTermMonths}
      onEditTermYearsChange={setEditTermYears}
      onOpenChange={setIsEditing}
      onSave={handleSaveMortgageDetails}
      onSelectAccount={selectAccount}
      saving={saving}
    />
  );

  const noAccount = categoryAccounts.length === 0;
  // Someone with no mortgage on record may not have one, so the empty view assumes nothing.
  const assumesNoMortgage = noAccount && !profileFacts.hasMortgage;

  const header = (
    <>
      <PageHeader
        description={
          // The empty state carries the explanation, as on the debt page, so both empty pages
          // start at the same height.
          noAccount
            ? undefined
            : "What you owe on your mortgage, what it costs each month and when the term ends."
        }
        // The page icon, empty or filled in; the empty state has none, so one is in view.
        illustration="empty-accounts"
        title="Your mortgage"
      />
      {showCategoryTabs ? (
        <Tabs
          aria-label="Property type"
          items={[...CATEGORY_TABS]}
          value={propertyCategory}
          onValueChange={(value) => switchToCategory(value as PropertyCategory)}
        />
      ) : null}
    </>
  );

  // PARTIAL STATE (E16 PR 6): what is saved as at most two plain figures, and one prompt with one
  // button. No strip of "Not set", no empty cards and no scenario zone.
  if (!isComplete) {
    const known: { label: string; value: ReactNode }[] = [];
    if (loanAmount > 0) {
      known.push({ label: "Remaining balance", value: <Money size="md" value={loanAmount} /> });
    }
    if (knownMonthlyPayment !== null) {
      known.push({
        label: "Monthly payment",
        value: <Money size="md" value={Math.round(knownMonthlyPayment)} />,
      });
    }
    if (interestRate > 0) {
      known.push({
        label: "Interest rate",
        value: (
          <Num
            fractionDigits={rateFractionDigits(interestRate)}
            kind="percent"
            size="md"
            value={interestRate}
          />
        ),
      });
    }
    if (!isBtl && remainingTerm > 0) {
      known.push({ label: "Years left", value: formatYearsLeft(remainingTerm) });
    }
    const prompt = {
      title: isBtl
        ? `Add your buy to let mortgage ${formatList(missingMortgageDetails)} to see your monthly payment and what overpaying would change`
        : `Add your ${formatList(missingMortgageDetails)} to see when the term ends and what overpaying would change`,
    };

    // EMPTY STATE: no mortgage account of the shown kind. Full width, with its illustration and
    // one button. Buy to let is never made up from older profile figures (HM-4).
    if (noAccount) {
      return (
        <PageBody className={pageRoot()}>
          {editDialog}
          <div className={partialStack()}>
            {header}
            <EmptyState
              action={
                <Button onClick={() => navigate("/app/accounts")}>
                  {isBtl
                    ? "Add a buy to let mortgage"
                    : assumesNoMortgage
                      ? "Add a mortgage"
                      : "Add mortgage account"}
                </Button>
              }
              description={
                isBtl
                  ? "If a property you let has a mortgage, add it on Accounts to see its payment and loan to value here."
                  : assumesNoMortgage
                    ? "If you have a mortgage, add it to see your payment and when the term ends."
                    : "Your details say you have a mortgage, but no mortgage account has been added. Add one to see your figures here."
              }
              id="mortgage-empty"
              title={
                isBtl
                  ? "No buy to let mortgage added"
                  : assumesNoMortgage
                    ? "No mortgage added"
                    : "No mortgage account added"
              }
            />
          </div>
        </PageBody>
      );
    }

    return (
      <PageBody className={pageRoot()}>
        {/* First child in both states, so switching state never remounts an open dialog. */}
        {editDialog}
        <div className={partialStack()}>
          {header}
          <section
            aria-labelledby="mortgage-prompt-title"
            className={promptBlock()}
            data-testid="mortgage-prompt"
            id="mortgage-prompt"
          >
            {known.length > 0 ? (
              <dl className={plainFigures()}>
                {known.slice(0, 2).map((figure) => (
                  <div className={plainFigure()} key={figure.label}>
                    <dt className={plainFigureLabel()}>{figure.label}</dt>
                    <dd className={plainFigureValue()}>{figure.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <div className={known.length > 0 ? promptDivider() : undefined}>
              <h2 className={promptTitle()} id="mortgage-prompt-title">
                {prompt.title}
              </h2>
              <div>
                <Button onClick={startEditing}>Add mortgage details</Button>
              </div>
              {saveMessage ? (
                <p className={promptStatus()} role="status">
                  {saveMessage}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </PageBody>
    );
  }

  // COMPLETE STATE (ruling D2: the hero is a saved fact, never an estimate). One code path: the
  // hero is the saved monthly payment when there is one, else the saved balance. The strip below
  // keeps to three: the other of those two, the rate and loan to value.
  const fixEndText =
    !isBtl && selectedFixEnd
      ? selectedFixEnd.ended
        ? "Fixed rate has ended"
        : (() => {
            const when = formatIsoMonthYear(selectedFixEnd.date);
            return when ? `Fixed until ${when}` : undefined;
          })()
      : undefined;

  const typeText = mortgageType === "interest-only" ? "Interest-only" : "Repayment";
  // Saved facts only (ruling D2): the stored fixed rate end date, else the repayment type. A term
  // end month would be today plus the stored term, which drifts, so it never sits here.
  const heroSubline =
    fixEndText ?? (isBtl ? `Buy to let, ${typeText.toLowerCase()}` : `${typeText} mortgage`);
  const heroIsPayment = storedPayment > 0;

  return (
    <PageBody className={pageRoot()}>
      {editDialog}
      <LiveRegion debounceMs={1000} message={mortgageHeadline} visuallyHidden />
      {header}

      <section
        aria-label="Your saved mortgage figures"
        className={savedSection()}
        data-testid="mortgage-saved"
        id="mortgage-saved"
      >
        {heroIsPayment ? (
          <HeroFigure
            id="mortgage-hero"
            label="Monthly payment"
            subline={heroSubline}
            value={Math.round(storedPayment)}
            valueFormat={{ fractionDigits: 0 }}
          />
        ) : (
          <HeroFigure
            emptyAction={
              <Button size="sm" variant="ghost" onClick={startEditing}>
                Add your balance
              </Button>
            }
            emptyPrompt="Add your remaining balance to see it here."
            id="mortgage-hero"
            label="Remaining balance"
            subline={jointBalanceNote ? `${heroSubline}. ${jointBalanceNote}` : heroSubline}
            value={loanAmount > 0 ? loanAmount : null}
          />
        )}
        <KpiStrip columns={3}>
          {heroIsPayment ? (
            <KpiCard
              label="Remaining balance"
              subtext={jointBalanceNote}
              value={loanAmount > 0 ? loanAmount : null}
              valueFormat={{ fractionDigits: 0 }}
            />
          ) : (
            <KpiCard
              emptyAction={
                <Button size="sm" variant="ghost" onClick={startEditing}>
                  Edit your details
                </Button>
              }
              explain={
                isBtl
                  ? "Worked out from your balance and interest rate."
                  : "Worked out from your balance, interest rate and years left."
              }
              label="Monthly payment"
              subtext="Estimate"
              value={knownMonthlyPayment === null ? null : Math.round(knownMonthlyPayment)}
              valueFormat={{ fractionDigits: 0 }}
            />
          )}
          <KpiCard
            label="Interest rate"
            value={
              <Num
                fractionDigits={rateFractionDigits(interestRate)}
                kind="percent"
                size="kpi"
                value={interestRate}
              />
            }
          />
          <KpiCard
            emptyAction={
              homeFromAccounts ? (
                isBtl ? (
                  AMBIGUOUS_RENTAL_TEXT
                ) : (
                  AMBIGUOUS_HOME_TEXT
                )
              ) : isBtl ? (
                // The edit form holds the property value, saved on the rental's account.
                <Button size="sm" variant="ghost" onClick={startEditing}>
                  Add the property value
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => navigate("/app/accounts")}>
                  Add your home's value
                </Button>
              )
            }
            explain={
              isBtl
                ? "Your buy to let mortgage balance divided by the property value you saved."
                : "Your mortgage balance divided by the home value you saved."
            }
            label="Loan to value"
            value={
              hasLtvData ? (
                <Num
                  fractionDigits={ltvFractionDigits(currentLtv)}
                  kind="percent"
                  size="kpi"
                  value={currentLtv}
                />
              ) : null
            }
          />
        </KpiStrip>
      </section>

      <MortgageAlerts
        refinanceWarning={refinanceWarning}
        onModelRateChange={() => openScenarioTool("rate-change")}
      />

      {isBtl ? (
        <BtlOverview properties={btlProperties} onManage={() => navigate("/app/accounts")} />
      ) : null}

      <MortgageSummary
        accountName={selectedAccount ? String(selectedAccount.name ?? "Mortgage") : null}
        homeEquity={
          // Not with two or more homes: one mortgage set against several would misstate it.
          savedHomeValue > 0 && !homeFromAccounts
            ? {
                homeValue: savedHomeValue,
                homeSharePercent,
                mortgageBalance: loanAmount,
                mortgageSharePercent,
              }
            : null
        }
        lastUpdated={lastUpdated}
        mortgageType={mortgageType}
        propertyCategory={propertyCategory}
        remainingTerm={remainingTerm}
        saveMessage={saveMessage}
        onEdit={startEditing}
      />

      <ScenarioZone
        announcement={scenarioAnnouncement}
        collapsible
        id={SCENARIO_ZONE_ID}
        isModified={scenario.isModified}
        notice={<ProjectionNotice />}
        open={scenarioOpen}
        showLabel="Show what-if: overpay or a new rate"
        summary={
          scenarioAnnouncement
            ? `Your illustration: ${scenarioAnnouncement}.`
            : `Starts from your mortgage of ${formatCurrency(loanAmount)} at ${YEARS_AND_RATE.format(interestRate)}% with ${formatYearsLeft(remainingTerm)} left.`
        }
        title="Model a change to your mortgage"
        onOpenChange={setScenarioOpen}
        onReset={scenario.reset}
      >
        <Tabs
          aria-label="Mortgage what-if tools"
          items={[...SCENARIO_TOOLS]}
          panelClassName={tabPanel()}
          panels={{
            overpayment: (
              <OverpaymentSimulator
                interestRate={scenarioValues.interestRate}
                loanAmount={scenarioValues.loanAmount}
                mortgageType={mortgageType}
                overpayment={scenarioValues.overpayment}
                remainingTerm={scenarioValues.remainingTerm}
                onOverpaymentChange={(value) => scenario.set("overpayment", value)}
              />
            ),
            "rate-change": (
              <RemortgageShockSim
                currentBalance={scenarioValues.loanAmount}
                currentPayment={scenarioMatchesSaved ? pagePayment : undefined}
                currentPaymentIsSaved={scenarioMatchesSaved && storedPayment > 0}
                currentRate={scenarioValues.interestRate}
                fixEndDate={isBtl ? null : selectedFixEndDate}
                mortgageType={mortgageType}
                remainingTermYears={
                  scenarioValues.remainingTerm > 0 ? scenarioValues.remainingTerm : undefined
                }
              />
            ),
            "overpay-vs-save": (
              <OverpayVsSaveCompare
                interestRate={scenarioValues.interestRate}
                loanAmount={scenarioValues.loanAmount}
                mortgageType={mortgageType}
                overpayment={scenarioValues.overpayment}
                remainingTerm={scenarioValues.remainingTerm}
                onOverpaymentChange={(value) => scenario.set("overpayment", value)}
              />
            ),
          }}
          size="sm"
          value={scenarioTool}
          onValueChange={(value) => setScenarioTool(value as ScenarioTool)}
        />
        <CollapsibleDrawer title="Starting figures" variant="quiet">
          <MortgageScenarioInputs
            isEdited={scenario.isEdited}
            values={scenarioValues}
            onChange={(key, value) => scenario.set(key, value)}
          />
        </CollapsibleDrawer>
      </ScenarioZone>

      {!isBtl ? (
        <CollapsibleDrawer title="Show cost details" variant="quiet">
          <MortgageTracker
            interestRate={interestRate}
            loanAmount={loanAmount}
            mortgageType={mortgageType}
            remainingTerm={remainingTerm}
          />
        </CollapsibleDrawer>
      ) : null}
    </PageBody>
  );
};

export default MortgageContainer;
