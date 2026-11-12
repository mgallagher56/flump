import {
  calculateDebtSchedule,
  compareAvalancheAndSnowball,
  type DebtItem,
  evaluateFinancialStage,
  PortfolioSnapshot,
} from "@flump/finance-engine";
import { Button, EmptyState, LiveRegion, ProjectionNotice } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
import { FaBookOpen, FaCalculator, FaCreditCard, FaExclamationTriangle } from "react-icons/fa";
import { Link, useFetcher, useLoaderData } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import AddDebtDialog from "~/components/debt/AddDebtDialog";
import DebtAccountsList from "~/components/debt/DebtAccountsList";
import DebtSummaryCards from "~/components/debt/DebtSummaryCards";
import DebtToWealthBridgeCard from "~/components/debt/DebtToWealthBridgeCard";
import PayoffStrategySwitcher from "~/components/debt/PayoffStrategySwitcher";
import UkDebtInstrumentsCard from "~/components/debt/UkDebtInstrumentsCard";
import { debtItemToAccountPayload } from "~/features/debt/utils/debtAccountMapping";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { useUserProfile } from "~/hooks/useUserProfile";

const containerStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  paddingBottom: "64px",
});

const tabStyle = (active: boolean) =>
  css({
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    borderRadius: "md",
    fontSize: "13px",
    fontWeight: "semibold",
    cursor: "pointer",
    backgroundColor: active ? "card" : "transparent",
    color: active ? "text.primary" : "text.muted",
    boxShadow: active
      ? "0 1px 2px color-mix(in srgb, var(--colors-surface-contrast) 6%, transparent)"
      : "none",
    border: "1px solid",
    borderColor: active ? "border.subtle" : "transparent",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
    _hover: active ? {} : { color: "text.primary" },
  });

export const DebtContainer: FC = () => {
  const loaderData = useLoaderData<any>();
  const { formatCurrency } = useFormatCurrency();
  const { profile } = useUserProfile();

  const debtInputs = loaderData?.debtInputs as
    | {
        monthlySurplus: number | null;
        liquidSavings: number;
        monthlyEssentialExpenses: number | null;
      }
    | undefined;
  const monthlySurplus = debtInputs?.monthlySurplus ?? null;
  const budgetSurplus = monthlySurplus ?? 0;

  // Tab state
  const [activeTab, setActiveTab] = useState<"simulator" | "accounts" | "instruments">("simulator");

  // Debts come straight from the user's liability accounts. Add, edit and delete persist through
  // the route action, and the loader revalidation refreshes this list.
  const accounts = loaderData?.accounts;
  const accountDetails = loaderData?.accountDetails;
  const debts = useMemo<DebtItem[]>(
    () => new PortfolioSnapshot(accounts ?? [], accountDetails ?? []).toDebtItems(),
    [accounts, accountDetails],
  );

  const [selectedStrategy, setSelectedStrategy] = useState<"avalanche" | "snowball">("avalanche");
  const [extraPayment, setExtraPayment] = useState<number>(50);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Financial stage evaluation
  const stageEval = useMemo(() => {
    return evaluateFinancialStage({
      debts,
      monthlySurplus: budgetSurplus,
      liquidSavings: debtInputs?.liquidSavings ?? 0,
      monthlyEssentialExpenses: debtInputs?.monthlyEssentialExpenses ?? 0,
    });
  }, [debts, budgetSurplus, debtInputs?.liquidSavings, debtInputs?.monthlyEssentialExpenses]);

  // Strategy comparison and promotional cliff detection
  const comparison = useMemo(() => {
    return compareAvalancheAndSnowball(debts, extraPayment);
  }, [debts, extraPayment]);

  const scheduleResult = useMemo(() => {
    return calculateDebtSchedule(
      debts,
      extraPayment,
      selectedStrategy.toUpperCase() as "AVALANCHE" | "SNOWBALL",
    );
  }, [debts, extraPayment, selectedStrategy]);

  const promoAlerts = scheduleResult.promoCliffAlerts.filter((a) => a.hasCliffRisk);

  const activeResult =
    selectedStrategy === "avalanche" ? comparison.avalanche : comparison.snowball;
  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalMin = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const hasDebts = debts.length > 0;
  // An unset APR is modelled as 0%, which would invent optimistic dates and savings.
  const aprUnknown = debts.some((d) => d.aprKnown === false);
  const minimumEstimated = debts.some((d) => d.minimumPaymentEstimated === true);

  // Headline outcome only; empty (nothing announced) when there are no debts, an APR is unknown
  // (figures would be invented), minimum payments are estimated or the payments never clear the debt.
  const debtHeadline =
    hasDebts && !aprUnknown && !minimumEstimated && activeResult.payoffAchievable
      ? `Debt-free by ${activeResult.debtFreeDate}, total interest ${formatCurrency(activeResult.totalInterest)}`
      : "";

  const fetcher = useFetcher();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const deleteOutcome = useFetcherOutcome(fetcher, { onSuccess: () => setConfirmDeleteId(null) });
  const debtToDelete = debts.find((d) => d.id === confirmDeleteId);
  const failedResult = fetcher.data as { success?: boolean; error?: string } | undefined;
  const saveError =
    debtToDelete === undefined && failedResult?.success === false
      ? (failedResult.error ?? "Something went wrong. Please try again.")
      : null;

  const handleAddDebt = (newDebt: Omit<DebtItem, "id">) => {
    const payload = debtItemToAccountPayload(newDebt);
    fetcher.submit(
      {
        intent: "createDebt",
        name: payload.name,
        type: payload.type,
        balance: String(payload.balance),
        interestRate: payload.interestRate === null ? "" : String(payload.interestRate),
        monthlyContribution:
          payload.monthlyContribution === null ? "" : String(payload.monthlyContribution),
      },
      { method: "POST", action: "/app/debt" },
    );
  };

  const handleConfirmDelete = (id: string) => {
    deleteOutcome.begin();
    fetcher.submit(
      { intent: "deleteDebt", accountId: id },
      { method: "POST", action: "/app/debt" },
    );
  };

  // Sends only the fields that changed. Balance is deliberately never sent:
  // PortfolioSnapshot prefers the latest accountDetails value over
  // account.balance, so a balance edit on an account with history would not
  // apply. The edit dialog is limited to name, APR and minimum payment.
  const handleUpdateDebt = (id: string, updates: Partial<DebtItem>) => {
    const current = debts.find((d) => d.id === id);
    if (!current) return;
    const payload = debtItemToAccountPayload({ ...current, ...updates });
    const fields: Record<string, string> = { intent: "updateDebt", accountId: id };
    if ("name" in updates) fields.name = payload.name;
    if ("apr" in updates || "aprKnown" in updates) {
      fields.interestRate = payload.interestRate === null ? "" : String(payload.interestRate);
    }
    if ("minimumPayment" in updates || "minimumPaymentEstimated" in updates) {
      fields.monthlyContribution =
        payload.monthlyContribution === null ? "" : String(payload.monthlyContribution);
    }
    if (Object.keys(fields).length === 2) return;
    fetcher.submit(fields, { method: "POST", action: "/app/debt" });
  };

  return (
    <div className={containerStyle}>
      <LiveRegion debounceMs={1000} message={debtHeadline} visuallyHidden />
      <ProjectionNotice />
      {/* 0% Promotional Cliff & Overdraft Warning Alerts */}
      {promoAlerts.length > 0 && (
        <div
          className={css({
            padding: "16px 20px",
            borderRadius: "xl",
            backgroundColor: "color-mix(in srgb, var(--colors-status-danger-text) 8%, transparent)",
            border: "1px solid",
            borderColor: "color-mix(in srgb, var(--colors-status-danger-text) 30%, transparent)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          })}
        >
          <div className={css({ display: "flex", alignItems: "center", gap: "8px" })}>
            <FaExclamationTriangle
              className={css({ color: "destructive.500", fontSize: "18px" })}
            />
            <FLPHeading as="h4" size="sm" color="destructive.500">
              0% balance transfer promotional expiry alert
            </FLPHeading>
          </div>
          {promoAlerts.map((alert) => (
            <div
              key={alert.debtId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <FLPText fontSize="xs" color="text.primary">
                <strong>{alert.debtName}</strong> promotional 0% APR expires on{" "}
                <strong>{alert.promoExpiryDate}</strong>. At current repayment rates,{" "}
                <span className={css({ fontVariantNumeric: "tabular-nums" })}>
                  {formatCurrency(alert.projectedBalanceAtExpiryGbp)}
                </span>{" "}
                will revert to <strong>{alert.revertApr}% APR</strong>.
              </FLPText>
              <FLPButton
                size="sm"
                variant="outline"
                onClick={() => setExtraPayment(alert.requiredMonthlyToClearBeforeCliff)}
              >
                Allocate £{alert.requiredMonthlyToClearBeforeCliff}/mo to clear
              </FLPButton>
            </div>
          ))}
        </div>
      )}

      {saveError ? (
        <p
          role="alert"
          className={css({
            padding: "12px 16px",
            borderRadius: "md",
            border: "1px solid",
            borderColor: "status.danger.border",
            backgroundColor: "status.danger.bg",
            color: "status.danger.text",
            fontSize: "sm",
          })}
        >
          {saveError}
        </p>
      ) : null}

      {/* 1. Header & Stage Notification */}
      <div
        className={css({
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginTop: "16px",
          marginBottom: "8px",
        })}
      >
        <div>
          <FLPHeading as="h1" color="text.primary" size="2xl">
            Debt payoff and recovery
          </FLPHeading>
          <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
            Model mathematically optimal debt clearance, manage promotional 0% offers, and bridge
            your surplus into long-term wealth.
          </FLPText>
        </div>
      </div>

      {/* 2. Summary Metric Cards (Single compact 4-card row) */}
      {hasDebts ? (
        <DebtSummaryCards
          aprUnknown={aprUnknown}
          minimumEstimated={minimumEstimated}
          debtFreeDate={activeResult.debtFreeDate}
          extraPayment={extraPayment}
          highInterestDebt={stageEval.highInterestDebt}
          monthlyMinimumTotal={totalMin}
          monthsShaved={
            selectedStrategy === "avalanche"
              ? comparison.monthsShavedAvalancheVsMin
              : Math.max(0, comparison.minimumOnly.months - comparison.snowball.months)
          }
          strategy={selectedStrategy}
          totalDebt={totalDebt}
          totalInterestSaved={
            selectedStrategy === "avalanche"
              ? comparison.interestSavedAvalancheVsMin
              : Math.max(
                  0,
                  comparison.minimumOnly.totalInterest - comparison.snowball.totalInterest,
                )
          }
        />
      ) : null}

      {/* Tab Bar: Segmented Navigation */}
      <div
        className={css({
          display: "flex",
          backgroundColor: "surface.sunken",
          border: "1px solid",
          borderColor: "border.subtle",
          padding: "4px",
          borderRadius: "lg",
          gap: "4px",
          overflowX: "auto",
          maxWidth: "100%",
          WebkitOverflowScrolling: "touch",
        })}
      >
        {hasDebts ? null : (
          <button
            type="button"
            className={tabStyle(activeTab !== "instruments")}
            onClick={() => setActiveTab("simulator")}
          >
            <FaCreditCard size={13} style={{ marginRight: "6px" }} /> Your debts
          </button>
        )}
        {hasDebts ? (
          <>
            <button
              type="button"
              className={tabStyle(activeTab === "simulator")}
              onClick={() => setActiveTab("simulator")}
            >
              <FaCalculator size={13} style={{ marginRight: "6px" }} /> Strategy & Payoff Simulator
            </button>
            <button
              type="button"
              className={tabStyle(activeTab === "accounts")}
              onClick={() => setActiveTab("accounts")}
            >
              <FaCreditCard size={13} style={{ marginRight: "6px" }} /> Liability Accounts & Cards (
              {debts.length})
            </button>
          </>
        ) : null}
        <button
          type="button"
          className={tabStyle(activeTab === "instruments")}
          onClick={() => setActiveTab("instruments")}
        >
          <FaBookOpen size={13} style={{ marginRight: "6px" }} /> UK Debt Rules & Helplines
        </button>
      </div>

      {!hasDebts && activeTab !== "instruments" ? (
        <EmptyState
          title="No debts yet"
          description="Add your credit cards, loans and overdrafts to compare payoff plans."
          action={
            <Button type="button" onClick={() => setIsAddModalOpen(true)}>
              Add debt
            </Button>
          }
        />
      ) : null}

      {/* Tab 1: Strategy & Payoff Simulator */}
      {hasDebts ? (
        <>
          <div
            style={
              activeTab === "simulator"
                ? { display: "block" }
                : {
                    height: 0,
                    overflow: "hidden",
                    opacity: 0,
                    position: "absolute",
                    pointerEvents: "none",
                  }
            }
          >
            <div
              className={css({
                display: "grid",
                gridTemplateColumns: { base: "1fr", lg: "repeat(12, 1fr)" },
                gap: "24px",
                alignItems: "start",
              })}
            >
              <div className={css({ gridColumn: { base: "span 1", lg: "span 5" } })}>
                {monthlySurplus === null ? (
                  <FLPText color="text.muted" fontSize="sm">
                    <Link
                      to="/app/budget"
                      className={css({
                        color: "primary",
                        textDecoration: "underline",
                        fontVariantNumeric: "tabular-nums",
                      })}
                    >
                      Set up your budget to see your monthly surplus
                    </Link>
                  </FLPText>
                ) : null}
                {aprUnknown ? (
                  <FLPText color="text.muted" fontSize="sm" data-testid="apr-unknown-note">
                    Some debts have no APR set, so the payoff figures below treat them as 0% and are
                    optimistic. Add each APR for accurate dates and interest.
                  </FLPText>
                ) : null}
                <PayoffStrategySwitcher
                  budgetSurplus={Math.max(0, budgetSurplus)}
                  comparison={comparison}
                  extraPayment={extraPayment}
                  selectedStrategy={selectedStrategy}
                  onChangeExtraPayment={setExtraPayment}
                  onSelectStrategy={setSelectedStrategy}
                />
                {monthlySurplus === null ? (
                  <FLPText color="text.muted" fontSize="xs" id="surplus-unknown-note">
                    Illustrative only: we do not know your monthly surplus, so these payoff results
                    assume the overpayment you choose is affordable.
                  </FLPText>
                ) : null}
              </div>
              <div className={css({ gridColumn: { base: "span 1", lg: "span 7" } })}>
                <DebtToWealthBridgeCard debts={debts} extraPayment={extraPayment} />
              </div>
            </div>
          </div>

          {/* Tab 2: Liability Accounts & Cards */}
          <div
            style={
              activeTab === "accounts"
                ? { display: "block" }
                : {
                    height: 0,
                    overflow: "hidden",
                    opacity: 0,
                    position: "absolute",
                    pointerEvents: "none",
                  }
            }
          >
            <DebtAccountsList
              debts={debts}
              onAddDebt={() => setIsAddModalOpen(true)}
              onDeleteDebt={(id) => setConfirmDeleteId(id)}
              onUpdateDebt={handleUpdateDebt}
            />
          </div>
        </>
      ) : null}

      {/* Tab 3: UK Specific Debt Instruments & Rules */}
      <div
        style={
          activeTab === "instruments"
            ? { display: "block" }
            : {
                height: 0,
                overflow: "hidden",
                opacity: 0,
                position: "absolute",
                pointerEvents: "none",
              }
        }
      >
        <UkDebtInstrumentsCard />
      </div>

      <ConfirmDialog
        open={debtToDelete !== undefined}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDeleteId(null);
            deleteOutcome.dismiss();
          }
        }}
        pending={deleteOutcome.pending}
        error={deleteOutcome.error}
        title={`Delete ${debtToDelete?.name ?? "debt"}?`}
        description="This deletes the account and its history. This can't be undone."
        confirmLabel="Delete debt"
        tone="danger"
        onConfirm={() => {
          if (confirmDeleteId) handleConfirmDelete(confirmDeleteId);
        }}
      />

      {/* Add Debt Modal */}
      <AddDebtDialog
        isOpen={isAddModalOpen}
        onAddDebt={handleAddDebt}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};

export default DebtContainer;
