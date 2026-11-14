import { UpdateAccountResponse } from "@flump/api-contract";
import {
  calculateLtvMilestones,
  isBuyToLetAccountName,
  isFigureKnown,
  PortfolioSnapshot,
  selectLoanToValue,
} from "@flump/finance-engine";
import {
  Button,
  CollapsibleDrawer,
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
import { useLoaderData, useNavigate, useSearchParams } from "react-router";
import { BtlOverview } from "~/features/mortgage/components/BtlOverview";
import { LtvMilestones } from "~/features/mortgage/components/LtvMilestones";
import { MortgageAlerts } from "~/features/mortgage/components/MortgageAlerts";
import { MortgageEditDialog } from "~/features/mortgage/components/MortgageEditDialog";
import { MortgageScenarioInputs } from "~/features/mortgage/components/MortgageScenarioInputs";
import { MortgageSummary } from "~/features/mortgage/components/MortgageSummary";
import { MortgageTracker } from "~/features/mortgage/components/MortgageTracker";
import {
  OVERPAYMENT_ERC_NOTE,
  OverpaymentSimulator,
} from "~/features/mortgage/components/OverpaymentSimulator";
import { OverpayVsSaveCompare } from "~/features/mortgage/components/OverpayVsSaveCompare";
import { RemortgageShockSim } from "~/features/mortgage/components/RemortgageShockSim";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { useScenarioState } from "~/hooks/useScenarioState";
import { useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/routes/app.mortgage";
import { apiFetch } from "~/services/api-client";
import { useFinancialBaseline } from "~/state/baseline.store";
import { buildWorkspacePicture } from "~/utils/financialPicture";
import { monthlyMortgagePayment } from "~/utils/mortgagePayment";
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
  promptText,
  promptTitle,
  savedSection,
  tabPanel,
} from "./MortgageContainer.styles";

const formatList = (items: string[]): string =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

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

const rateFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });
const termFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const monthYearFormat = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const SCENARIO_ZONE_ID = "mortgage-scenario";

const scrollToId = (id: string) => {
  document.getElementById(id)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
};

const longDate = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

/** "Jun 2027" for a stored ISO date, or `null` when it cannot be read. */
const monthYear = (iso: string): string | null => {
  const parsed = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : monthYearFormat.format(parsed);
};

/** The month the saved term ends: today plus the years left, as "Jun 2051". */
const payoffMonth = (termYears: number): string => {
  const now = new Date();
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + Math.round(termYears * 12), 1),
  );
  return monthYearFormat.format(end);
};

const years = (term: number) => `${termFormat.format(term)} ${term === 1 ? "year" : "years"}`;

const MortgageContainer: FC = () => {
  const { accounts = [], accountDetails = [], userProfile } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, setProfile, updateProfile } = useUserProfile();
  const { formatCurrency } = useFormatCurrency();
  const { baseline } = useFinancialBaseline();

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

  // SAVED mortgage figures. Only the loader data and a successful save write these: the scenario
  // zone below has its own in-memory copy, so nothing a slider does can change what is shown here.
  // Unknown values start at 0 (empty): nothing is assumed, and the page prompts for them.
  const [mortgageType, setMortgageType] = useState<"repayment" | "interest-only">(
    userProfile?.mortgageType || "repayment",
  );
  const [loanAmount, setLoanAmount] = useState<number>(userProfile?.mortgageBalance ?? 0);
  const [interestRate, setInterestRate] = useState<number>(0);
  const [remainingTerm, setRemainingTerm] = useState<number>(0);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editLoanAmount, setEditLoanAmount] = useState<number>(userProfile?.mortgageBalance ?? 0);
  // Held as strings so a cleared field stays empty instead of showing 0.
  const [editInterestRate, setEditInterestRate] = useState("");
  const [editRemainingTerm, setEditRemainingTerm] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editMortgageType, setEditMortgageType] = useState<"repayment" | "interest-only">(
    userProfile?.mortgageType || "repayment",
  );
  const [editFixEndDate, setEditFixEndDate] = useState("");
  // Only a date the user changed in this form is sent, so switching accounts or reseeding the form
  // can never clear a stored fixed rate end date.
  const [editFixEndTouched, setEditFixEndTouched] = useState(false);
  // Account fields saved on this page, laid over the loader rows until the next load, so the
  // picture below reads what was just stored.
  const [accountPatches, setAccountPatches] = useState<Record<string, Record<string, unknown>>>({});

  // Synced account state
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

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

  // What can be stored: a linked residential account holds balance, rate and term. Buy to let
  // keeps balance and rate on the profile. Anything else would only be held in memory, so the
  // edit form does not offer it.
  const canSaveFigures = propertyCategory === "btl" || !!selectedAccountId;
  const canSaveTerm = propertyCategory === "residential" && !!selectedAccountId;

  // Scenario state: seeded from the saved figures above, in memory only (no storage, no network,
  // no money in the URL).
  const savedFigures = useMemo(
    () => ({ loanAmount, interestRate, remainingTerm, overpayment: 0 }),
    [loanAmount, interestRate, remainingTerm],
  );
  const scenario = useScenarioState(savedFigures);
  const [scenarioTool, setScenarioTool] = useState<ScenarioTool>("overpayment");

  const openScenarioTool = (tool: ScenarioTool) => {
    setScenarioTool(tool);
    scrollToId(SCENARIO_ZONE_ID);
  };

  const startEditing = () => {
    setEditLoanAmount(loanAmount);
    setEditInterestRate(interestRate > 0 ? String(interestRate) : "");
    setEditRemainingTerm(remainingTerm > 0 ? String(Math.round(remainingTerm * 100) / 100) : "");
    setSaveError(null);
    setEditMortgageType(mortgageType);
    setEditFixEndDate(selectedFixEndDate ?? "");
    setEditFixEndTouched(false);
    setIsEditing(true);
  };

  const handleSaveMortgageDetails = async () => {
    const rate = Math.max(0, Number(editInterestRate));
    // Term is stored in whole months (1..600), so clamp once and show what is stored.
    const rawTerm = Math.max(0, Number(editRemainingTerm));
    const termMonths = rawTerm > 0 ? Math.min(600, Math.max(1, Math.round(rawTerm * 12))) : 0;
    const term = termMonths / 12;
    setSaveError(null);
    const saved = ["repayment type"];
    // What this save stores, applied to the saved figures only once the request has succeeded.
    const next = { loanAmount, interestRate, remainingTerm };
    try {
      if (propertyCategory === "btl") {
        await updateProfile({
          buyToLetMortgageType: editMortgageType,
          buyToLetMortgageBalance: editLoanAmount > 0 ? editLoanAmount : null,
          buyToLetMortgageRate: rate > 0 ? rate : null,
        });
        next.loanAmount = editLoanAmount;
        next.interestRate = rate;
        saved.push("balance", "interest rate");
      } else {
        await updateProfile({ hasMortgage: true, mortgageType: editMortgageType });
        if (selectedAccountId) {
          // The proxy adds the session; the browser never holds a token. Term is stored in
          // months, and the balance on a liability account is stored as a negative figure.
          const body: {
            balance?: number;
            interestRate?: number;
            termMonths?: number;
            fixedRateEndDate?: string | null;
          } = {};
          if (editLoanAmount > 0 && editLoanAmount !== loanAmount) body.balance = -editLoanAmount;
          if (rate > 0) body.interestRate = rate;
          if (termMonths > 0) body.termMonths = termMonths;
          // An emptied date clears the stored one.
          const fixEnd = editFixEndDate.trim() === "" ? null : editFixEndDate.trim();
          if (editFixEndTouched && fixEnd !== (selectedFixEndDate ?? null)) {
            body.fixedRateEndDate = fixEnd;
          }
          if (Object.keys(body).length > 0) {
            await apiFetch(`/accounts/${selectedAccountId}`, {
              method: "PATCH",
              body,
              schema: UpdateAccountResponse,
            });
            const accountId = selectedAccountId;
            setAccountPatches((prev) => ({
              ...prev,
              [accountId]: { ...prev[accountId], ...body },
            }));
          }
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
        }
      }
      setMortgageType(editMortgageType);
      setLoanAmount(next.loanAmount);
      setInterestRate(next.interestRate);
      setRemainingTerm(next.remainingTerm);
      setSavedAt(new Date().toISOString());
      setSaveMessage(`Saved ${formatList(saved)}`);
      setIsEditing(false);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error("Failed to save mortgage details:", err);
      setSaveMessage(null);
      setSaveError("We could not save your mortgage details. Nothing has changed. Try again.");
    }
  };

  const currentMonthlyPayment = useMemo(
    () => monthlyMortgagePayment(loanAmount, interestRate, remainingTerm, mortgageType),
    [loanAmount, interestRate, remainingTerm, mortgageType],
  );

  const isBtl = propertyCategory === "btl";

  // Buy to let carries no stored term, so it is never asked for.
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
    scrollToId(SCENARIO_ZONE_ID);
  }, [toolParam, isComplete]);

  // Property value is only ever what the user entered; it is never derived from the loan.
  // Residential loan to value (E16 PR 3): the selected residential mortgage over residential
  // Property accounts (the seeded home estimate is one), buy to let left out. Built from the
  // same rows as the picture, so a saved balance (accountPatches) is never stale.
  const residentialLtvFigure = useMemo(
    () =>
      selectLoanToValue(new PortfolioSnapshot(pictureAccounts, accountDetails), {
        mortgageAccountId: selectedAccountId,
      }),
    [pictureAccounts, accountDetails, selectedAccountId],
  );
  const residentialLtv = isFigureKnown(residentialLtvFigure) ? residentialLtvFigure.value : null;
  const propertyValue = isBtl
    ? (profileFacts.buyToLetPropertyValue ?? 0)
    : (residentialLtv?.homeValue ?? 0);
  const ltvLoan = isBtl ? loanAmount : (residentialLtv?.mortgageBalance ?? 0);

  const hasLtvData = ltvLoan > 0 && propertyValue > 0;
  const currentLtv = !hasLtvData
    ? 0
    : !isBtl && residentialLtv
      ? residentialLtv.percent
      : (ltvLoan / propertyValue) * 100;

  const ltvMilestones = useMemo(() => {
    if (!hasLtvData) return [];
    const fixEnd = isBtl ? undefined : (selectedFixEndDate ?? undefined);
    return calculateLtvMilestones(propertyValue, ltvLoan, fixEnd);
  }, [hasLtvData, propertyValue, ltvLoan, isBtl, selectedFixEndDate]);

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

  // Residential mortgage accounts: buy-to-let mortgages are left out of the residential view.
  const mortgageAccounts = useMemo(() => {
    return accounts.filter(
      (acc: any) => acc.type === "Mortgage" && !isBuyToLetAccountName(String(acc.name ?? "")),
    );
  }, [accounts]);

  // Residential or buy to let tabs show only when the user has both (E16 PR 6).
  const hasResidential =
    mortgageAccounts.length > 0 ||
    !!profileFacts.hasMortgage ||
    profileFacts.housingStatus === "mortgage";
  const hasBtl =
    !!profileFacts.hasBuyToLet ||
    (profileFacts.buyToLetMortgageBalance ?? 0) > 0 ||
    (profileFacts.buyToLetPropertyValue ?? 0) > 0 ||
    (profileFacts.buyToLetMonthlyRental ?? 0) > 0;
  const showCategoryTabs = hasResidential && hasBtl;

  // Read the stored figures for one residential account. Unset values stay empty (0).
  const accountFigures = (id: string) => {
    const account = accounts.find((a: any) => a.id === id);
    const balance = new PortfolioSnapshot(accounts, accountDetails).getLatestBalance(id);
    const rate = Number(account?.interestRate);
    const termMonths = Number(account?.termMonths);
    return {
      balance: Math.max(balance || 0, 0),
      rate: Math.max(rate || 0, 0),
      term: termMonths > 0 ? termMonths / 12 : 0,
    };
  };

  // Pre-populate with first linked mortgage account if found
  useEffect(() => {
    if (mortgageAccounts.length > 0 && !selectedAccountId && propertyCategory === "residential") {
      setSelectedAccountId(mortgageAccounts[0].id);
    }
  }, [mortgageAccounts, selectedAccountId, propertyCategory]);

  // Handle account selection
  useEffect(() => {
    if (selectedAccountId && propertyCategory === "residential") {
      const snapshot = new PortfolioSnapshot(accounts, accountDetails);
      const bal = snapshot.getLatestBalance(selectedAccountId);
      if (bal > 0) {
        setLoanAmount(bal);
      }
      // A stored account rate is real data; an unset rate stays empty.
      const storedRate = Number(
        accounts.find((a: any) => a.id === selectedAccountId)?.interestRate,
      );
      if (storedRate > 0) {
        setInterestRate(storedRate);
      }
      // A stored term (months) is real data; an unset term stays empty.
      const storedTermMonths = Number(
        accounts.find((a: any) => a.id === selectedAccountId)?.termMonths,
      );
      if (storedTermMonths > 0) {
        setRemainingTerm(storedTermMonths / 12);
      }
    }
  }, [selectedAccountId, accounts, accountDetails, propertyCategory]);

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
    setEditRemainingTerm(figures.term > 0 ? String(Math.round(figures.term * 100) / 100) : "");
    const fixEnd = id
      ? picture.fixedRateEnds.find((fact) => fact.accountId === id)?.date
      : undefined;
    setEditFixEndDate(fixEnd ?? "");
    setEditFixEndTouched(false);
  };

  const switchToCategory = (cat: PropertyCategory) => {
    setPropertyCategory(cat);
    setIsEditing(false);
    setSavedAt(null);
    scenario.reset();
    if (cat === "btl") {
      setLoanAmount(profileFacts.buyToLetMortgageBalance ?? 0);
      setInterestRate(profileFacts.buyToLetMortgageRate ?? 0);
      // No term is stored for buy to let.
      setRemainingTerm(0);
      setMortgageType(profileFacts.buyToLetMortgageType ?? "interest-only");
      setSelectedAccountId(null);
    } else {
      setMortgageType(profileFacts.mortgageType ?? "repayment");
      if (mortgageAccounts.length > 0) {
        setSelectedAccountId(mortgageAccounts[0].id);
      } else {
        setLoanAmount(0);
        setInterestRate(0);
        setRemainingTerm(0);
      }
    }
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
    isComplete && currentMonthlyPayment > 0
      ? `Monthly mortgage payment ${formatCurrency(currentMonthlyPayment)}`
      : "";

  const btlMonthlyRent = profileFacts.buyToLetMonthlyRental || 0;
  const btlPropertyValue = profileFacts.buyToLetPropertyValue || 0;
  const btlGrossYield =
    btlPropertyValue > 0 && btlMonthlyRent > 0
      ? ((btlMonthlyRent * 12) / btlPropertyValue) * 100
      : null;

  const editPayment =
    editLoanAmount > 0 && Number(editInterestRate) > 0 && Number(editRemainingTerm) > 0
      ? monthlyMortgagePayment(
          editLoanAmount,
          Number(editInterestRate),
          Number(editRemainingTerm),
          editMortgageType,
        )
      : null;
  const knownMonthlyPayment = currentMonthlyPayment > 0 ? currentMonthlyPayment : null;

  // "Last updated" for the Saved line: this session's save, else the newest stored month for the
  // linked account, else when the profile was last changed.
  const lastUpdated = useMemo(() => {
    const fromSave = longDate(savedAt);
    if (fromSave) return `Last updated ${fromSave}`;
    if (propertyCategory === "residential" && selectedAccountId) {
      const rows = accountDetails.filter(
        (row: any) => String(row.account_id) === selectedAccountId,
      );
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
  }, [savedAt, propertyCategory, selectedAccountId, accountDetails, userProfile]);

  // Scenario outputs. These read scenario values only, and nothing above reads them.
  const scenarioValues = scenario.values;
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

  const savedBasis = `Starting from your figures: ${formatCurrency(loanAmount)} at ${rateFormat.format(interestRate)}%${
    remainingTerm > 0 ? `, ${years(remainingTerm)} left` : ""
  }`;

  const selectedAccount = selectedAccountId
    ? mortgageAccounts.find((acc: any) => acc.id === selectedAccountId)
    : null;

  const editDialog = (
    <MortgageEditDialog
      canSaveFigures={canSaveFigures}
      canSaveTerm={canSaveTerm}
      editFixEndDate={editFixEndDate}
      editInterestRate={editInterestRate}
      editLoanAmount={editLoanAmount}
      editMortgageType={editMortgageType}
      editPayment={editPayment}
      editRemainingTerm={editRemainingTerm}
      mortgageAccounts={isBtl ? [] : mortgageAccounts}
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
      onEditLoanAmountChange={setEditLoanAmount}
      onEditMortgageTypeChange={setEditMortgageType}
      onEditRemainingTermChange={setEditRemainingTerm}
      onOpenChange={setIsEditing}
      onSave={handleSaveMortgageDetails}
      onSelectAccount={selectAccount}
    />
  );

  const header = (
    <>
      <PageHeader
        subtitle="What you owe on your mortgage, what it costs each month and when it would be paid off."
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
        value: <Num fractionDigits={2} kind="percent" size="md" value={interestRate} />,
      });
    }
    if (!isBtl && remainingTerm > 0) {
      known.push({ label: "Years left", value: years(remainingTerm) });
    }
    const noAccount = !isBtl && mortgageAccounts.length === 0;
    const prompt = noAccount
      ? profileFacts.hasMortgage
        ? {
            title: "No mortgage account added",
            text: "Your details say you have a mortgage, but no mortgage account has been added. Add one to see your figures here.",
          }
        : { title: "Add your mortgage to see your payment, balance and payoff date", text: null }
      : {
          title: isBtl
            ? `Add your buy to let mortgage ${formatList(missingMortgageDetails)} to see your monthly payment and what overpaying would change`
            : `Add your ${formatList(missingMortgageDetails)} to see your payoff date and what overpaying would change`,
          text: null,
        };

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
              {prompt.text ? <p className={promptText()}>{prompt.text}</p> : null}
              <div>
                {noAccount ? (
                  <Button onClick={() => navigate("/app/accounts")}>Add mortgage account</Button>
                ) : (
                  <Button onClick={startEditing}>Add mortgage details</Button>
                )}
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

  // COMPLETE STATE: the hero is the saved balance (ruling 7: a saved fact, never an estimate), then
  // a strip of up to four with the estimates first, "Your details", the zone and the drawers.
  const fixEndCaption =
    !isBtl && selectedFixEnd
      ? selectedFixEnd.ended
        ? "Fixed rate has ended"
        : (() => {
            const when = monthYear(selectedFixEnd.date);
            return when ? `Fixed until ${when}` : undefined;
          })()
      : undefined;

  const isInterestOnly = mortgageType === "interest-only";
  const typeText = isInterestOnly ? "Interest-only" : "Repayment";
  const showPayoff = !isBtl && remainingTerm > 0;
  const heroSubline = isBtl ? `Buy to let, ${typeText.toLowerCase()}` : `${typeText} mortgage`;

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
        <HeroFigure
          emptyAction={
            <Button size="sm" variant="ghost" onClick={startEditing}>
              Add your balance
            </Button>
          }
          emptyPrompt="Add your remaining balance to see it here."
          id="mortgage-hero"
          label="Remaining balance"
          subline={heroSubline}
          value={loanAmount > 0 ? loanAmount : null}
        />
        <KpiStrip columns={showPayoff ? 4 : 3}>
          {/* Buy to let stores no term, so it has no payoff date. */}
          {showPayoff ? (
            <KpiCard
              label={isInterestOnly ? "Term ends" : "Paid off by"}
              subtext={isInterestOnly ? "Estimate. The loan is still owed then." : "Estimate"}
              value={<span data-figure="">{payoffMonth(remainingTerm)}</span>}
            />
          ) : null}
          <KpiCard
            emptyAction={
              <Button size="sm" variant="ghost" onClick={startEditing}>
                Edit your details
              </Button>
            }
            label="Monthly payment"
            subtext="Estimate"
            value={knownMonthlyPayment === null ? null : Math.round(knownMonthlyPayment)}
            valueFormat={{ fractionDigits: 0 }}
          />
          <KpiCard
            label="Interest rate"
            subtext={fixEndCaption}
            value={<Num fractionDigits={2} kind="percent" size="lg" value={interestRate} />}
          />
          <KpiCard
            emptyAction={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate(isBtl ? "/app/profile" : "/app/accounts")}
              >
                {isBtl ? "Add the property value" : "Add your home's value"}
              </Button>
            }
            label="Loan to value"
            value={
              hasLtvData ? (
                <Num fractionDigits={1} kind="percent" size="lg" value={currentLtv} />
              ) : null
            }
          />
        </KpiStrip>
      </section>

      <MortgageAlerts
        refinanceWarning={refinanceWarning}
        onModelRateChange={() => openScenarioTool("rate-change")}
      />

      <MortgageSummary
        accountName={selectedAccount ? String(selectedAccount.name ?? "Mortgage") : null}
        lastUpdated={lastUpdated}
        mortgageType={mortgageType}
        propertyCategory={propertyCategory}
        remainingTerm={remainingTerm}
        saveMessage={saveMessage}
        onEdit={startEditing}
      />

      {isBtl ? (
        <BtlOverview
          grossYield={btlGrossYield}
          monthlyPayment={knownMonthlyPayment}
          monthlyRent={btlMonthlyRent}
          propertyCount={profileFacts.buyToLetCount ?? null}
          onConfigure={() => navigate("/app/profile")}
        />
      ) : null}

      <ScenarioZone
        announcement={scenarioAnnouncement}
        basis={savedBasis}
        footer={
          <Button size="sm" variant="ghost" onClick={startEditing}>
            Update your details
          </Button>
        }
        id={SCENARIO_ZONE_ID}
        isModified={scenario.isModified}
        notice={<ProjectionNotice lead={OVERPAYMENT_ERC_NOTE} />}
        title="Model a change to your mortgage"
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
                currentRate={scenarioValues.interestRate}
                fixEndDate={isBtl ? null : selectedFixEndDate}
                propertyValue={propertyValue || undefined}
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
              />
            ),
          }}
          size="sm"
          value={scenarioTool}
          onValueChange={(value) => setScenarioTool(value as ScenarioTool)}
        />
        <CollapsibleDrawer title="More options" variant="quiet">
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

      {hasLtvData ? (
        <CollapsibleDrawer title="Show loan to value bands" variant="quiet">
          <LtvMilestones
            currentLtv={currentLtv}
            loanAmount={ltvLoan}
            milestones={ltvMilestones}
            ownershipSharePct={baseline.propertyOwnershipSharePct ?? 100}
            propertyValue={propertyValue}
            onModelOverpayment={(amount) => {
              scenario.set("overpayment", amount);
              openScenarioTool("overpayment");
            }}
          />
        </CollapsibleDrawer>
      ) : null}
    </PageBody>
  );
};

export default MortgageContainer;
