import {
  compareAvalancheAndSnowball,
  type DebtItem,
  PortfolioSnapshot,
} from "@flump/finance-engine";
import {
  Button,
  CollapsibleDrawer,
  EmptyState,
  Illustration,
  PageBody,
  PageHeader,
  ProjectionNotice,
  ScenarioZone,
} from "@repo/ui";
import type { ToolSlug } from "@repo/ui/tools";
import { type FC, useEffect, useMemo, useRef, useState } from "react";
import { Link, useFetcher, useLoaderData } from "react-router";
import { AddDebtDialog } from "~/features/debt/components/AddDebtDialog";
import { DebtAccountsList } from "~/features/debt/components/DebtAccountsList";
import { DebtHelpLink } from "~/features/debt/components/DebtHelpLink";
import { DebtSummary } from "~/features/debt/components/DebtSummary";
import { PayExtraTool } from "~/features/debt/components/PayExtraTool";
import { UkDebtInstrumentsCard } from "~/features/debt/components/UkDebtInstrumentsCard";
import { debtItemToAccountPayload } from "~/features/debt/utils/debtAccountMapping";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { useScenarioState } from "~/hooks/useScenarioState";
import { emptyStack, emptyWrap, errorBanner, pageRoot, plainLink } from "./DebtContainer.styles";

/** The overpay-or-save calculator (D5 replaces the debt "into savings" tool with this link). */
const OVERPAY_OR_SAVE_SLUG: ToolSlug = "mortgage-overpayment-vs-isa-calculator";

const SAVED_SCENARIO = { extraPayment: 0, strategy: "avalanche" as "avalanche" | "snowball" };

export const SAVE_ERROR_FALLBACK = "We could not save that debt. Nothing has changed. Try again.";

export const DebtContainer: FC = () => {
  const loaderData = useLoaderData<any>();
  const { formatCurrency } = useFormatCurrency();

  const debtInputs = loaderData?.debtInputs as
    | {
        monthlySurplus: number | null;
        liquidSavings: number;
        monthlyEssentialExpenses: number | null;
        totalDebt?: number;
      }
    | undefined;
  const budgetLeftOver = debtInputs?.monthlySurplus ?? null;

  // Debts come straight from the user's liability accounts. Add, edit and delete persist through
  // the route action, and the loader revalidation refreshes this list. Balances are amounts owed:
  // liabilities are stored negative (#665), so every figure below uses the absolute value.
  const accounts = loaderData?.accounts;
  const accountDetails = loaderData?.accountDetails;
  const debts = useMemo<DebtItem[]>(
    () => new PortfolioSnapshot(accounts ?? [], accountDetails ?? []).toDebtItems(),
    [accounts, accountDetails],
  );

  // Scenario state: container memory only (shared hook). It never reaches the hero, the KPI
  // strip, the saved list, the URL, storage or the network, and it starts at £0.
  const scenario = useScenarioState(SAVED_SCENARIO);
  const extraPayment = scenario.values.extraPayment;
  const selectedStrategy = scenario.values.strategy;
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const comparison = useMemo(
    () => compareAvalancheAndSnowball(debts, extraPayment),
    [debts, extraPayment],
  );
  // Saved figures: minimum payments only. Used by the first view.
  const savedComparison = useMemo(() => compareAvalancheAndSnowball(debts, 0), [debts]);

  const activeResult =
    selectedStrategy === "avalanche" ? comparison.avalanche : comparison.snowball;
  const payoffBalance = debts.reduce((sum, d) => sum + Math.abs(d.balance ?? 0), 0);
  // Total debt is the picture's figure, so an overdrawn current account counts here as it does
  // on the dashboard (it is never a payoff item, so the schedules leave it out).
  const totalDebt = Math.abs(debtInputs?.totalDebt ?? payoffBalance);
  const totalMin = debts.reduce((sum, d) => sum + (d.minimumPayment ?? 0), 0);
  const hasDebts = debts.length > 0;
  // An unset APR is modelled as 0%, which would invent optimistic dates and savings.
  const missingApr = debts.filter((d) => d.aprKnown === false);
  const aprUnknown = missingApr.length > 0;
  const minimumEstimated = debts.some((d) => d.minimumPaymentEstimated === true);

  // Scenario outcome only; empty (nothing announced) until the extra payment is above £0, when
  // an APR is unknown (figures would be invented), minimum payments are estimated or the payments
  // never pay off the debt.
  const debtHeadline =
    hasDebts &&
    scenario.isModified &&
    extraPayment > 0 &&
    !aprUnknown &&
    !minimumEstimated &&
    activeResult.payoffAchievable !== false
      ? `debt-free by ${activeResult.debtFreeDate}, total interest ${formatCurrency(activeResult.totalInterest)}`
      : "";

  const fetcher = useFetcher();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const returnFocusToEdit = useRef<string | null>(null);
  const confirmDeleteIdRef = useRef<string | null>(null);
  confirmDeleteIdRef.current = confirmDeleteId;
  const deleteOutcome = useFetcherOutcome(fetcher, {
    onSuccess: () => {
      // The deleted debt's Edit button is gone, so focus falls back to the list heading.
      returnFocusToEdit.current = confirmDeleteIdRef.current;
      setConfirmDeleteId(null);
    },
  });
  const debtToDelete = debts.find((d) => d.id === confirmDeleteId);
  // The confirm dialog opens from the edit dialog's "Delete debt", which is gone by then, so a
  // cancelled delete returns focus to that debt's Edit button instead of the page.
  useEffect(() => {
    if (confirmDeleteId !== null) return;
    const id = returnFocusToEdit.current;
    if (!id) return;
    returnFocusToEdit.current = null;
    // After the dialog's own focus return, which runs on a zero timeout as it unmounts.
    const timer = setTimeout(() => {
      const edit = document.querySelector<HTMLElement>(`[data-debt-edit="${CSS.escape(id)}"]`);
      // The last debt deleted: the empty state's "Add a debt" takes focus.
      const fallback =
        document.getElementById("debt-accounts-heading") ??
        document.querySelector<HTMLElement>("[data-debt-empty-action]");
      (edit ?? fallback)?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [confirmDeleteId]);
  const failedResult = fetcher.data as { success?: boolean; error?: string } | undefined;
  const saveError =
    debtToDelete === undefined && failedResult?.success === false
      ? (failedResult.error ?? SAVE_ERROR_FALLBACK)
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

  // Sends only the fields that changed. Balance is not sent: the edit dialog is limited to name,
  // APR and minimum payment.
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

  const header = (
    <PageHeader
      actions={
        // With no debts the empty state holds the one "Add a debt" button.
        hasDebts ? (
          <Button type="button" onClick={() => setIsAddModalOpen(true)}>
            Add a debt
          </Button>
        ) : undefined
      }
      description={
        // The empty state below carries the explanation, so the header does not repeat it.
        hasDebts
          ? "What you owe, and an estimate of when it would be paid off at minimum payments."
          : undefined
      }
      title="Your debts"
    />
  );

  const errorAlert = saveError ? (
    <p className={errorBanner} role="alert">
      {saveError}
    </p>
  ) : null;

  return (
    <PageBody className={pageRoot}>
      {/* With no debts the header and empty state sit together, as on the mortgage page, so both
          empty pages start at the same height. */}
      {hasDebts ? header : null}
      {hasDebts ? errorAlert : null}

      {hasDebts ? (
        <>
          <DebtSummary
            debtCount={debts.length}
            debtFreeDate={savedComparison.minimumOnly.debtFreeDate}
            minimumEstimated={minimumEstimated}
            missingAprCount={missingApr.length}
            monthlyMinimumTotal={totalMin}
            payoffAchievable={savedComparison.minimumOnly.payoffAchievable !== false}
            totalDebt={totalDebt}
            onAddRate={() => setEditingId(missingApr[0]?.id ?? null)}
          />

          <DebtAccountsList
            debts={debts}
            editingId={editingId}
            onDeleteDebt={(id) => setConfirmDeleteId(id)}
            onEditingIdChange={setEditingId}
            onUpdateDebt={handleUpdateDebt}
          />

          <ScenarioZone
            announcement={debtHeadline}
            notice={
              <ProjectionNotice
                lead={
                  [
                    budgetLeftOver === null
                      ? "We do not know what you have left over each month, so these results assume you can afford the extra payment you choose."
                      : "",
                    aprUnknown
                      ? "Some debts have no APR set, so the estimate uses 0% for them and the real dates may be later."
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
              />
            }
            footer={
              // The same control as the mortgage page's zone footer.
              <Button
                size="sm"
                type="button"
                variant="ghost"
                onClick={() => {
                  const heading = document.getElementById("debt-accounts-heading");
                  heading?.scrollIntoView?.({ block: "start" });
                  heading?.focus();
                }}
              >
                Update your details
              </Button>
            }
            isModified={scenario.isModified}
            title="Model a change to your debts"
            onReset={scenario.reset}
          >
            <PayExtraTool
              budgetLeftOver={budgetLeftOver}
              comparison={comparison}
              extraPayment={extraPayment}
              selectedStrategy={selectedStrategy}
              startBalance={payoffBalance}
              onChangeExtraPayment={(amount) => scenario.set("extraPayment", amount)}
              onSelectStrategy={(strategy) => scenario.set("strategy", strategy)}
            />
          </ScenarioZone>

          <p>
            <Link className={plainLink} to={`/tools/${OVERPAY_OR_SAVE_SLUG}`}>
              Compare paying off early with saving
            </Link>
          </p>

          <CollapsibleDrawer title="UK debt calculators" variant="quiet">
            <UkDebtInstrumentsCard />
          </CollapsibleDrawer>
        </>
      ) : (
        <div className={emptyStack}>
          {header}
          {errorAlert}
          <div className={emptyWrap}>
            <EmptyState
              action={
                <Button
                  data-debt-empty-action=""
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                >
                  Add a debt
                </Button>
              }
              description="Add a credit card, loan or overdraft to see when it would be paid off at your minimum payments."
              id="debt-empty"
              illustration={<Illustration scene="empty-accounts" />}
              title="No debts added"
            />
          </div>
        </div>
      )}

      {/* Shown to every user in the same place, never triggered by their figures (R3 exception, R4). */}
      <DebtHelpLink />

      <ConfirmDialog
        confirmLabel="Delete debt"
        description="Its history will be deleted too. This cannot be undone."
        error={deleteOutcome.error}
        open={debtToDelete !== undefined}
        pending={deleteOutcome.pending}
        title={`Delete ${debtToDelete?.name ?? "debt"}?`}
        tone="danger"
        onConfirm={() => {
          if (confirmDeleteId) handleConfirmDelete(confirmDeleteId);
        }}
        onOpenChange={(open) => {
          if (!open) {
            returnFocusToEdit.current = confirmDeleteId;
            setConfirmDeleteId(null);
            deleteOutcome.dismiss();
          }
        }}
      />

      <AddDebtDialog
        isOpen={isAddModalOpen}
        onAddDebt={handleAddDebt}
        onClose={() => setIsAddModalOpen(false)}
      />
    </PageBody>
  );
};

export default DebtContainer;
