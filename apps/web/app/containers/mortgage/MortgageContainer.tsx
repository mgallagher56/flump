import { calculateLtvMilestones, PortfolioSnapshot } from "@flump/finance-engine";
import {
  Button,
  CollapsibleDrawer,
  EmptyState,
  Icon,
  LiveRegion,
  PageHeader,
  ProjectionNotice,
} from "@repo/ui";
import { Building2, Coins, Home, LineChart, Percent } from "lucide-react";
import { type FC, useEffect, useMemo, useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { BtlOverview } from "~/features/mortgage/components/BtlOverview";
import { LtvMilestones } from "~/features/mortgage/components/LtvMilestones";
import { MortgageAlerts } from "~/features/mortgage/components/MortgageAlerts";
import { MortgageSummary } from "~/features/mortgage/components/MortgageSummary";
import { MortgageTracker } from "~/features/mortgage/components/MortgageTracker";
import { OverpaymentSimulator } from "~/features/mortgage/components/OverpaymentSimulator";
import { OverpayVsSaveCompare } from "~/features/mortgage/components/OverpayVsSaveCompare";
import { RemortgageShockSim } from "~/features/mortgage/components/RemortgageShockSim";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/routes/app.mortgage";
import { apiFetch } from "~/services/api-client";
import { useFinancialBaseline } from "~/state/baseline.store";
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

const MortgageContainer: FC = () => {
  const { accounts = [], accountDetails = [], userProfile } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { profile, setProfile, updateProfile } = useUserProfile();
  const { formatCurrency } = useFormatCurrency();
  const { baseline } = useFinancialBaseline();

  // Sync profile from loader into atom
  useEffect(() => {
    if (userProfile) setProfile(userProfile);
  }, [userProfile, setProfile]);

  const [activeTab, setActiveTab] = useState<"tracker" | "milestones" | "simulator" | "compare">(
    "tracker",
  );
  const [propertyCategory, setPropertyCategory] = useState<"residential" | "btl">("residential");
  const [mortgageType, setMortgageType] = useState<"repayment" | "interest-only">(
    userProfile?.mortgageType || "repayment",
  );

  // Shared mortgage states
  // Unknown values start at 0 (empty): nothing is assumed, and the page prompts for them.
  const [loanAmount, setLoanAmount] = useState<number>(userProfile?.mortgageBalance ?? 0);
  const [interestRate, setInterestRate] = useState<number>(0);
  const [remainingTerm, setRemainingTerm] = useState<number>(0);
  const [overpayment, setOverpayment] = useState<number>(0);
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

  const startEditing = () => {
    setEditLoanAmount(loanAmount);
    setEditInterestRate(interestRate > 0 ? String(interestRate) : "");
    setEditRemainingTerm(remainingTerm > 0 ? String(Math.round(remainingTerm * 100) / 100) : "");
    setSaveError(null);
    setEditMortgageType(mortgageType);
    setIsEditing(true);
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
    setLoanAmount(editLoanAmount);
    setInterestRate(rate);
    setRemainingTerm(term);
    setMortgageType(editMortgageType);
    setSaveError(null);
    const saved = ["repayment type"];
    try {
      // The profile stores only whether there is a mortgage and its type. Balance, rate and
      // term are not profile fields, so they are not sent.
      await updateProfile({ hasMortgage: true, mortgageType: editMortgageType });
      if (selectedAccountId && propertyCategory === "residential" && (rate > 0 || termMonths > 0)) {
        // The proxy adds the session; the browser never holds a token. Term is stored in months.
        const body: { interestRate?: number; termMonths?: number } = {};
        if (rate > 0) body.interestRate = rate;
        if (termMonths > 0) body.termMonths = termMonths;
        await apiFetch(`/accounts/${selectedAccountId}`, { method: "PATCH", body });
        if (body.interestRate !== undefined) saved.push("interest rate");
        if (body.termMonths !== undefined) saved.push("term");
      }
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

  const missingMortgageDetails = [
    loanAmount > 0 ? null : "balance",
    interestRate > 0 ? null : "rate",
    remainingTerm > 0 ? null : "term",
  ].filter((x): x is string => x !== null);

  // Property value is only ever what the user entered; it is never derived from the loan.
  const propertyValue =
    (propertyCategory === "btl" ? profile.buyToLetPropertyValue : profile.homeValue) ?? 0;

  const hasLtvData = loanAmount > 0 && propertyValue > 0;
  const currentLtv = hasLtvData ? (loanAmount / propertyValue) * 100 : 0;

  const ltvMilestones = useMemo(() => {
    if (!hasLtvData) return [];
    return calculateLtvMilestones(propertyValue, loanAmount, profile.mortgageRenewalDate);
  }, [hasLtvData, propertyValue, loanAmount, profile.mortgageRenewalDate]);

  const refinanceWarning = useMemo(() => {
    if (!profile.mortgageRenewalDate) return null;
    const expiry = new Date(profile.mortgageRenewalDate).getTime();
    if (Number.isNaN(expiry)) return null;
    const now = new Date().getTime();
    const diffMonths = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24 * 30.4375));
    if (diffMonths <= 6) {
      return {
        diffMonths,
        date: profile.mortgageRenewalDate,
      };
    }
    return null;
  }, [profile.mortgageRenewalDate]);

  // Synced account state
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Filter for mortgage accounts
  const mortgageAccounts = useMemo(() => {
    return accounts.filter((acc: any) => acc.type === "Mortgage");
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
    if (cat === "btl") {
      setLoanAmount(profile.buyToLetMortgageBalance ?? 0);
      setInterestRate(profile.buyToLetMortgageRate ?? 0);
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

  // Live BTL monthly payment calculation
  const btlMonthlyPayment = useMemo(
    () => monthlyMortgagePayment(loanAmount, interestRate, remainingTerm, mortgageType),
    [loanAmount, interestRate, remainingTerm, mortgageType],
  );

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
  const knownMonthlyPayment = missingMortgageDetails.length === 0 ? currentMonthlyPayment : null;
  const btlKnownPayment = missingMortgageDetails.length === 0 ? btlMonthlyPayment : null;

  const tabs = [
    { id: "tracker", label: "Mortgage tracker", icon: Home },
    { id: "milestones", label: "LTV milestones", icon: Percent },
    { id: "simulator", label: "Overpayment simulator", icon: LineChart },
    { id: "compare", label: "Overpay vs save", icon: Coins },
  ] as const;

  return (
    <div className={pageRoot()}>
      <LiveRegion debounceMs={1000} message={mortgageHeadline} visuallyHidden />
      <ProjectionNotice />

      <MortgageAlerts
        refinanceWarning={refinanceWarning}
        showMissingAccount={
          propertyCategory === "residential" &&
          !!profile.hasMortgage &&
          mortgageAccounts.length === 0
        }
        onAddAccount={() => navigate("/app/accounts")}
        onSimulateRateShock={() => setActiveTab("simulator")}
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
        editLoanAmount={editLoanAmount}
        editInterestRate={editInterestRate}
        editMortgageType={editMortgageType}
        editPayment={editPayment}
        editRemainingTerm={editRemainingTerm}
        interestRate={interestRate}
        isEditing={isEditing}
        loanAmount={loanAmount}
        monthlyPayment={knownMonthlyPayment}
        mortgageType={mortgageType}
        propertyCategory={propertyCategory}
        remainingTerm={remainingTerm}
        saveError={saveError}
        saveMessage={saveMessage}
        termSaved={propertyCategory === "residential" && !!selectedAccountId}
        onCancelEditing={cancelEditing}
        onEditInterestRateChange={setEditInterestRate}
        onEditLoanAmountChange={setEditLoanAmount}
        onEditMortgageTypeChange={setEditMortgageType}
        onEditRemainingTermChange={setEditRemainingTerm}
        onSave={handleSaveMortgageDetails}
        onStartEditing={startEditing}
      />

      {propertyCategory === "btl" && (
        <BtlOverview
          grossYield={btlGrossYield}
          monthlyPayment={btlKnownPayment}
          monthlyRent={btlMonthlyRent}
          mortgageType={mortgageType}
          propertyCount={profile.buyToLetCount ?? null}
          onConfigure={() => navigate("/app/profile")}
        />
      )}

      {/* Roving-tabindex tabs on plain buttons (Radix Tabs ignore click in jsdom). */}
      <div aria-label="Mortgage tools" className={tabList()} role="tablist">
        {tabs.map((tab, index) => (
          <button
            aria-controls={`mortgage-panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            className={tabButton({ active: activeTab === tab.id })}
            id={`mortgage-tab-${tab.id}`}
            key={tab.id}
            role="tab"
            tabIndex={activeTab === tab.id ? 0 : -1}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => {
              if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
              const last = tabs.length - 1;
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % tabs.length
                  : event.key === "ArrowLeft"
                    ? (index + last) % tabs.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? last
                        : null;
              if (next === null) return;
              event.preventDefault();
              setActiveTab(tabs[next].id);
              document.getElementById(`mortgage-tab-${tabs[next].id}`)?.focus();
            }}
          >
            <Icon icon={tab.icon} size="sm" />
            {tab.label}
          </button>
        ))}
      </div>

      {missingMortgageDetails.length > 0 && propertyCategory === "residential" && (
        <div className={missingPrompt()}>
          <span>Add your mortgage {formatList(missingMortgageDetails)} to see your figures.</span>
          <Button size="sm" onClick={startEditing}>
            Add mortgage details
          </Button>
        </div>
      )}

      <div
        aria-labelledby={`mortgage-tab-${activeTab}`}
        className={tabPanel()}
        id={`mortgage-panel-${activeTab}`}
        role="tabpanel"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: WAI-ARIA APG tabpanel pattern, so keyboard users can reach a panel with no focusable content
        tabIndex={0}
      >
        {activeTab === "tracker" && (
          <MortgageTracker
            interestRate={interestRate}
            loanAmount={loanAmount}
            mortgageAccounts={propertyCategory === "residential" ? mortgageAccounts : []}
            mortgageType={mortgageType}
            remainingTerm={remainingTerm}
            selectedAccountId={selectedAccountId}
            onInterestRateChange={setInterestRate}
            onLoanAmountChange={setLoanAmount}
            onMortgageTypeChange={setMortgageType}
            onRemainingTermChange={setRemainingTerm}
            onSelectAccount={(id) => {
              setSelectedAccountId(id);
              if (!id) {
                setLoanAmount(0);
              }
            }}
          />
        )}

        {activeTab === "milestones" && !hasLtvData && (
          <EmptyState
            description="Add your mortgage balance and property value to see LTV milestones."
            headingLevel="h3"
            size="sm"
            title="LTV milestones not available"
          />
        )}

        {activeTab === "milestones" && hasLtvData && (
          <LtvMilestones
            currentLtv={currentLtv}
            loanAmount={loanAmount}
            milestones={ltvMilestones}
            ownershipSharePct={baseline.propertyOwnershipSharePct ?? 100}
            propertyValue={propertyValue}
            onApplyOverpayment={(amount) => {
              setOverpayment(amount);
              setActiveTab("simulator");
            }}
          />
        )}

        {activeTab === "simulator" && (
          <>
            <CollapsibleDrawer
              subtitle="Model the monthly payment increase when your current fixed-rate deal expires"
              title="Remortgage rate shock simulator"
            >
              <RemortgageShockSim
                currentBalance={loanAmount}
                currentRate={interestRate}
                fixEndDate={profile.mortgageRenewalDate}
                propertyValue={propertyValue || undefined}
                remainingTermYears={remainingTerm > 0 ? remainingTerm : undefined}
              />
            </CollapsibleDrawer>
            <OverpaymentSimulator
              interestRate={interestRate}
              loanAmount={loanAmount}
              mortgageType={mortgageType}
              overpayment={overpayment}
              remainingTerm={remainingTerm}
              onOverpaymentChange={setOverpayment}
            />
          </>
        )}

        {activeTab === "compare" && (
          <OverpayVsSaveCompare
            interestRate={interestRate}
            loanAmount={loanAmount}
            mortgageType={mortgageType}
            overpayment={overpayment}
            remainingTerm={remainingTerm}
          />
        )}
      </div>
    </div>
  );
};

export default MortgageContainer;
