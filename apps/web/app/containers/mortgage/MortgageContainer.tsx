import {
  calculateLtvMilestones,
  isBuyToLetAccountName,
  isFigureKnown,
  PortfolioSnapshot,
  selectLoanToValue,
} from "@flump/finance-engine";
import { Button, EmptyState, Icon, LiveRegion, PageHeader, ScenarioZone } from "@repo/ui";
import { Building2, Coins, Home, LineChart, Percent } from "lucide-react";
import { type FC, useEffect, useMemo, useRef, useState } from "react";
import { useLoaderData, useNavigate, useSearchParams } from "react-router";
import { HousingCostCard } from "~/features/housing/components/HousingCostCard";
import { BtlOverview } from "~/features/mortgage/components/BtlOverview";
import { LtvMilestones } from "~/features/mortgage/components/LtvMilestones";
import { MortgageAlerts } from "~/features/mortgage/components/MortgageAlerts";
import { MortgageScenarioInputs } from "~/features/mortgage/components/MortgageScenarioInputs";
import { MortgageSummary } from "~/features/mortgage/components/MortgageSummary";
import { MortgageTracker } from "~/features/mortgage/components/MortgageTracker";
import { OverpaymentSimulator } from "~/features/mortgage/components/OverpaymentSimulator";
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
  categorySwitch,
  missingPrompt,
  pageRoot,
  tabButton,
  tabList,
  tabPanel,
} from "./MortgageContainer.styles";

const formatList = (items: string[]): string =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

type ScenarioTool = "overpayment" | "rate-change" | "overpay-vs-save";

const SCENARIO_TOOLS = [
  { id: "overpayment", label: "Overpayment simulator", icon: LineChart },
  { id: "rate-change", label: "Rate change", icon: Percent },
  { id: "overpay-vs-save", label: "Overpay vs save", icon: Coins },
] as const;

const isScenarioTool = (value: string | null): value is ScenarioTool =>
  SCENARIO_TOOLS.some((tool) => tool.id === value);

const rateFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });
const termFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

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

const MortgageContainer: FC = () => {
  const { accounts = [], accountDetails = [], userProfile } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, setProfile, updateProfile } = useUserProfile();
  const { formatCurrency } = useFormatCurrency();
  const { baseline } = useFinancialBaseline();

  // Sync profile from loader into atom
  useEffect(() => {
    if (userProfile) setProfile(userProfile);
  }, [userProfile, setProfile]);

  const [propertyCategory, setPropertyCategory] = useState<"residential" | "btl">("residential");

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
  // Account fields saved on this page, laid over the loader rows until the next load, so the
  // picture below reads what was just stored.
  const [accountPatches, setAccountPatches] = useState<Record<string, Record<string, unknown>>>({});

  // Synced account state
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // The one financial picture (E23/E32): housing cost and fix-end dates are read from it, never
  // recomputed here. Built from saved rows plus what this page has just saved.
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

  const toolParam = searchParams.get("tool");
  const handledToolParam = useRef<string | null>(null);
  useEffect(() => {
    if (!isScenarioTool(toolParam) || handledToolParam.current === toolParam) return;
    handledToolParam.current = toolParam;
    setScenarioTool(toolParam);
    scrollToId(SCENARIO_ZONE_ID);
  }, [toolParam]);

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
    setIsEditing(true);
    scrollToId("mortgage-summary");
  };

  const cancelEditing = () => {
    setIsEditing(false);
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
          if (fixEnd !== (selectedFixEndDate ?? null)) body.fixedRateEndDate = fixEnd;
          if (Object.keys(body).length > 0) {
            await apiFetch(`/accounts/${selectedAccountId}`, { method: "PATCH", body });
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
      setSaveError("Could not save your mortgage details. Please try again.");
    }
  };

  const currentMonthlyPayment = useMemo(
    () => monthlyMortgagePayment(loanAmount, interestRate, remainingTerm, mortgageType),
    [loanAmount, interestRate, remainingTerm, mortgageType],
  );

  // Buy to let carries no stored term, so it is never asked for.
  const missingMortgageDetails = [
    loanAmount > 0 ? null : "balance",
    interestRate > 0 ? null : "rate",
    remainingTerm > 0 || propertyCategory === "btl" ? null : "term",
  ].filter((x): x is string => x !== null);

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
  const isBtl = propertyCategory === "btl";
  const propertyValue = isBtl
    ? (profile.buyToLetPropertyValue ?? 0)
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
    const fixEnd =
      propertyCategory === "residential" ? (selectedFixEndDate ?? undefined) : undefined;
    return calculateLtvMilestones(propertyValue, ltvLoan, fixEnd);
  }, [hasLtvData, propertyValue, ltvLoan, propertyCategory, selectedFixEndDate]);

  // The selected account's stored fix-end date, from the picture. Shown as a fact within six
  // months of the end, and once it has ended.
  const refinanceWarning =
    propertyCategory === "residential" &&
    selectedFixEnd &&
    (selectedFixEnd.ended || selectedFixEnd.monthsRemaining <= 6)
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

  const switchToCategory = (cat: "residential" | "btl") => {
    setPropertyCategory(cat);
    setIsEditing(false);
    setSavedAt(null);
    scenario.reset();
    if (cat === "btl") {
      setLoanAmount(profile.buyToLetMortgageBalance ?? 0);
      setInterestRate(profile.buyToLetMortgageRate ?? 0);
      // No term is stored for buy to let.
      setRemainingTerm(0);
      setMortgageType(profile.buyToLetMortgageType ?? "interest-only");
      setSelectedAccountId(null);
    } else {
      setMortgageType(profile.mortgageType ?? "repayment");
      if (mortgageAccounts.length > 0) {
        setSelectedAccountId(mortgageAccounts[0].id);
      } else {
        setLoanAmount(0);
        setInterestRate(0);
        setRemainingTerm(0);
      }
    }
  };

  // Headline outcome only; empty (nothing announced) until balance, rate and term are all known.
  const mortgageHeadline =
    missingMortgageDetails.length === 0
      ? `Monthly mortgage payment ${formatCurrency(currentMonthlyPayment)}`
      : "";

  const btlMonthlyRent = profile.buyToLetMonthlyRental || 0;
  const btlPropertyValue = profile.buyToLetPropertyValue || 0;
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

  const savedBasis =
    loanAmount > 0 && interestRate > 0 && (remainingTerm > 0 || propertyCategory === "btl")
      ? `Starting from your figures: ${formatCurrency(loanAmount)} at ${rateFormat.format(interestRate)}%${
          remainingTerm > 0
            ? `, ${termFormat.format(remainingTerm)} ${remainingTerm === 1 ? "year" : "years"} left`
            : ""
        }`
      : "Some of your figures are not saved yet, so set the starting figures below.";

  return (
    <div className={pageRoot()}>
      <LiveRegion debounceMs={1000} message={mortgageHeadline} visuallyHidden />

      <MortgageAlerts
        refinanceWarning={refinanceWarning}
        showMissingAccount={
          propertyCategory === "residential" &&
          !!profile.hasMortgage &&
          mortgageAccounts.length === 0
        }
        onAddAccount={() => navigate("/app/accounts")}
        onSimulateRateShock={() => openScenarioTool("rate-change")}
      />

      <PageHeader
        actions={
          <fieldset aria-label="Property type" className={categorySwitch()}>
            <Button
              aria-pressed={propertyCategory === "residential"}
              size="sm"
              variant={propertyCategory === "residential" ? "primary" : "outline"}
              onClick={() => switchToCategory("residential")}
            >
              <Icon icon={Home} size="sm" />
              Residential mortgage
            </Button>
            <Button
              aria-pressed={propertyCategory === "btl"}
              size="sm"
              variant={propertyCategory === "btl" ? "primary" : "outline"}
              onClick={() => switchToCategory("btl")}
            >
              <Icon icon={Building2} size="sm" />
              Buy to let (BTL)
            </Button>
          </fieldset>
        }
        subtitle="Where you stand on your mortgage, and how a little extra each month could change your finish date."
        title="Your mortgage"
      />

      <MortgageSummary
        canSaveFigures={canSaveFigures}
        canSaveTerm={canSaveTerm}
        editLoanAmount={editLoanAmount}
        editInterestRate={editInterestRate}
        editMortgageType={editMortgageType}
        editPayment={editPayment}
        editRemainingTerm={editRemainingTerm}
        interestRate={interestRate}
        isEditing={isEditing}
        lastUpdated={lastUpdated}
        loanAmount={loanAmount}
        monthlyPayment={knownMonthlyPayment}
        mortgageType={mortgageType}
        propertyCategory={propertyCategory}
        remainingTerm={remainingTerm}
        saveError={saveError}
        saveMessage={saveMessage}
        onAddAccount={() => navigate("/app/accounts")}
        onCancelEditing={cancelEditing}
        onEditInterestRateChange={setEditInterestRate}
        onEditLoanAmountChange={setEditLoanAmount}
        onEditMortgageTypeChange={setEditMortgageType}
        onEditRemainingTermChange={setEditRemainingTerm}
        onSave={handleSaveMortgageDetails}
        onStartEditing={startEditing}
        editFixEndDate={editFixEndDate}
        onEditFixEndDateChange={setEditFixEndDate}
      />

      {propertyCategory === "residential" && userProfile?.housingStatus === "mortgage" && (
        <HousingCostCard fixedRateEnd={selectedFixEnd} housingCost={picture.housingCost} />
      )}

      {missingMortgageDetails.length > 0 && propertyCategory === "residential" && (
        <div className={missingPrompt()}>
          <span>Add your mortgage {formatList(missingMortgageDetails)} to see your figures.</span>
          <Button
            size="sm"
            onClick={canSaveFigures ? startEditing : () => navigate("/app/accounts")}
          >
            Add mortgage details
          </Button>
        </div>
      )}

      {propertyCategory === "btl" && (
        <BtlOverview
          grossYield={btlGrossYield}
          monthlyPayment={knownMonthlyPayment}
          monthlyRent={btlMonthlyRent}
          mortgageType={mortgageType}
          propertyCount={profile.buyToLetCount ?? null}
          onConfigure={() => navigate("/app/profile")}
        />
      )}

      <MortgageTracker
        interestRate={interestRate}
        loanAmount={loanAmount}
        mortgageAccounts={propertyCategory === "residential" ? mortgageAccounts : []}
        mortgageType={mortgageType}
        remainingTerm={remainingTerm}
        selectedAccountId={selectedAccountId}
        onSelectAccount={(id) => {
          setSelectedAccountId(id);
          scenario.reset();
          if (!id) {
            setLoanAmount(0);
            setInterestRate(0);
            setRemainingTerm(0);
          }
        }}
      />

      {hasLtvData ? (
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
      ) : (
        <EmptyState
          description="Add your mortgage balance and property value to see LTV milestones."
          headingLevel="h3"
          size="sm"
          title="LTV milestones not available"
        />
      )}

      <ScenarioZone
        announcement={scenarioAnnouncement}
        basis={savedBasis}
        footer={
          <Button size="sm" variant="ghost" onClick={startEditing}>
            Update your details
          </Button>
        }
        id={SCENARIO_ZONE_ID}
        title="Model a change to your mortgage"
        isModified={scenario.isModified}
        tools={
          // Roving-tabindex tabs on plain buttons (Radix Tabs ignore click in jsdom).
          <div aria-label="Mortgage what-if tools" className={tabList()} role="tablist">
            {SCENARIO_TOOLS.map((tab, index) => (
              <button
                aria-controls={`mortgage-tool-panel-${tab.id}`}
                aria-selected={scenarioTool === tab.id}
                className={tabButton({ active: scenarioTool === tab.id })}
                id={`mortgage-tool-tab-${tab.id}`}
                key={tab.id}
                role="tab"
                tabIndex={scenarioTool === tab.id ? 0 : -1}
                type="button"
                onClick={() => setScenarioTool(tab.id)}
                onKeyDown={(event) => {
                  if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
                  const last = SCENARIO_TOOLS.length - 1;
                  const next =
                    event.key === "ArrowRight"
                      ? (index + 1) % SCENARIO_TOOLS.length
                      : event.key === "ArrowLeft"
                        ? (index + last) % SCENARIO_TOOLS.length
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? last
                            : null;
                  if (next === null) return;
                  event.preventDefault();
                  setScenarioTool(SCENARIO_TOOLS[next].id);
                  document.getElementById(`mortgage-tool-tab-${SCENARIO_TOOLS[next].id}`)?.focus();
                }}
              >
                <Icon icon={tab.icon} size="sm" />
                {tab.label}
              </button>
            ))}
          </div>
        }
        onReset={scenario.reset}
      >
        <MortgageScenarioInputs
          isEdited={scenario.isEdited}
          values={scenarioValues}
          onChange={(key, value) => scenario.set(key, value)}
        />
        <div
          aria-labelledby={`mortgage-tool-tab-${scenarioTool}`}
          className={tabPanel()}
          id={`mortgage-tool-panel-${scenarioTool}`}
          role="tabpanel"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: WAI-ARIA APG tabpanel pattern, so keyboard users can reach a panel with no focusable content
          tabIndex={0}
        >
          {scenarioTool === "overpayment" && (
            <OverpaymentSimulator
              interestRate={scenarioValues.interestRate}
              loanAmount={scenarioValues.loanAmount}
              mortgageType={mortgageType}
              overpayment={scenarioValues.overpayment}
              remainingTerm={scenarioValues.remainingTerm}
              onOverpaymentChange={(value) => scenario.set("overpayment", value)}
            />
          )}

          {scenarioTool === "rate-change" && (
            <RemortgageShockSim
              currentBalance={scenarioValues.loanAmount}
              currentRate={scenarioValues.interestRate}
              fixEndDate={propertyCategory === "residential" ? selectedFixEndDate : null}
              propertyValue={propertyValue || undefined}
              remainingTermYears={
                scenarioValues.remainingTerm > 0 ? scenarioValues.remainingTerm : undefined
              }
            />
          )}

          {scenarioTool === "overpay-vs-save" && (
            <OverpayVsSaveCompare
              interestRate={scenarioValues.interestRate}
              loanAmount={scenarioValues.loanAmount}
              mortgageType={mortgageType}
              overpayment={scenarioValues.overpayment}
              remainingTerm={scenarioValues.remainingTerm}
            />
          )}
        </div>
      </ScenarioZone>
    </div>
  );
};

export default MortgageContainer;
