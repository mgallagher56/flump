import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
import {
  FaChartLine,
  FaEdit,
  FaExternalLinkAlt,
  FaPiggyBank,
  FaPlus,
  FaTrash,
} from "react-icons/fa";
import { useFetcher, useNavigate } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import type { Account } from "~/containers/accounts/types";
import { useResponsive } from "~/context/ResponsiveContext";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import AddSavingsAccountDialog from "./AddSavingsAccountDialog";

export interface SavingsAccountsListProps {
  accounts: Account[];
  onOpenAddModal: () => void;
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
}

export function calculateOneYearCompoundInterest(
  balance: number,
  rate: number,
  monthly: number,
): number {
  if (rate <= 0) return 0;
  const monthlyRate = rate / 100 / 12;
  let b = balance;
  for (let m = 0; m < 12; m++) {
    b = b * (1 + monthlyRate) + monthly;
  }
  return Math.max(0, b - balance - monthly * 12);
}

const cardStyle = css({
  padding: "24px",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "surface",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
});

const headerRowStyle = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "12px",
});

const tableContainerStyle = css({
  overflowX: "auto",
  width: "100%",
});

const tableStyle = css({
  width: "100%",
  borderCollapse: "collapse",
  textAlign: "left",
  fontSize: "sm",
});

const thStyle = css({
  padding: "12px 16px",
  fontWeight: "semibold",
  color: "text.muted",
  borderBottom: "1px solid",
  borderColor: "border",
  whiteSpace: "nowrap",
});

const trStyle = css({
  borderBottom: "1px solid",
  borderColor: "border",
  transition: "background-color 0.15s ease",
  _hover: {
    backgroundColor: "color-mix(in srgb, var(--colors-primary) 3%, transparent)",
  },
});

const tdStyle = css({
  padding: "16px",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
});

const badgeStyle = (type: string) =>
  css({
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "3px 8px",
    borderRadius: "full",
    fontSize: "xs",
    fontWeight: "medium",
    backgroundColor:
      type === "Investment"
        ? "color-mix(in srgb, var(--colors-chart-accent-purple) 12%, transparent)"
        : "color-mix(in srgb, var(--colors-chart-wealth) 12%, transparent)",
    color: type === "Investment" ? "var(--colors-chart-accent-purple)" : "status.positive.text",
  });

const actionBtnStyle = css({
  background: "none",
  border: "none",
  color: "text.muted",
  cursor: "pointer",
  padding: "6px",
  borderRadius: "md",
  transition: "all 0.15s ease",
  _hover: {
    color: "primary",
    backgroundColor: "color-mix(in srgb, var(--colors-primary) 8%, transparent)",
  },
});

const deleteBtnStyle = css({
  background: "none",
  border: "none",
  color: "text.muted",
  cursor: "pointer",
  padding: "6px",
  borderRadius: "md",
  transition: "all 0.15s ease",
  _hover: {
    color: "status.danger.text",
    backgroundColor: "color-mix(in srgb, var(--colors-status-danger-text) 8%, transparent)",
  },
});

const inlineInputStyle = css({
  width: "90px",
  padding: "4px 8px",
  fontSize: "sm",
  textAlign: "right",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "primary",
  backgroundColor: "surface",
  color: "text.primary",
  outline: "none",
  _focusVisible: {
    outline: "2px solid",
    outlineColor: "border.focusRing",
    outlineOffset: "2px",
  },
});

const editableCellStyle = css({
  background: "none",
  border: "none",
  font: "inherit",
  color: "inherit",
  textAlign: "inherit",
  fontVariantNumeric: "tabular-nums",
  cursor: "pointer",
  borderRadius: "sm",
  padding: "2px 6px",
  margin: "-2px -6px",
  transition: "background-color 0.15s ease",
  _hover: {
    backgroundColor: "color-mix(in srgb, var(--colors-primary) 8%, transparent)",
  },
});

const tfootRowStyle = css({
  borderTop: "2px solid",
  borderColor: "border",
  backgroundColor: "color-mix(in srgb, var(--colors-primary) 3%, transparent)",
  fontWeight: "semibold",
});

export const SavingsAccountsList: FC<SavingsAccountsListProps> = ({
  accounts,
  onOpenAddModal,
  isMobile: propIsMobile,
  variant = "desktop",
}) => {
  const { formatCurrency } = useFormatCurrency();
  const { isMobile: contextIsMobile } = useResponsive();
  const isMobileVariant = propIsMobile ?? (variant === "mobile" ? true : contextIsMobile);
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const deleteOutcome = useFetcherOutcome(fetcher, { onSuccess: () => setConfirmDeleteId(null) });
  const [inlineEdit, setInlineEdit] = useState<{
    accountId: string;
    field: "balance" | "interestRate" | "monthlyContribution";
    value: string;
  } | null>(null);

  const handleConfirmDelete = (accountId: string) => {
    deleteOutcome.begin();
    fetcher.submit(
      {
        intent: "deleteAccount",
        accountId,
      },
      { method: "POST", action: "/app/savings" },
    );
  };

  const accountToDelete = confirmDeleteId
    ? accounts.find((acc) => acc.id === confirmDeleteId)
    : undefined;

  const commitInlineEdit = () => {
    if (!inlineEdit) return;
    const numericVal = Number(inlineEdit.value);
    const safeVal = Number.isFinite(numericVal) && numericVal >= 0 ? numericVal : 0;

    fetcher.submit(
      {
        intent: "updateSavingsAccount",
        accountId: inlineEdit.accountId,
        [inlineEdit.field]: String(safeVal),
      },
      { method: "POST", action: "/app/savings" },
    );
    setInlineEdit(null);
  };

  const summaryTotals = useMemo(() => {
    let totalBal = 0;
    let weightedSum = 0;
    let totalMonthly = 0;
    let totalAnnualInt = 0;

    accounts.forEach((acc) => {
      const bal = Number(acc.balance) || 0;
      const rate = Number(acc.interestRate) || 0;
      const monthly = Number(acc.monthlyContribution) || 0;
      totalBal += bal;
      weightedSum += bal * rate;
      totalMonthly += monthly;
      totalAnnualInt += calculateOneYearCompoundInterest(bal, rate, monthly);
    });

    const weightedApy =
      totalBal > 0
        ? weightedSum / totalBal
        : accounts.length > 0
          ? accounts.reduce((s, a) => s + (Number(a.interestRate) || 0), 0) / accounts.length
          : 0;

    return {
      totalBal,
      weightedApy,
      totalMonthly,
      totalAnnualInt,
    };
  }, [accounts]);

  return (
    <>
      <FLPCard className={cardStyle}>
        <div className={headerRowStyle}>
          <div>
            <FLPHeading as="h4" size="md">
              Savings and investment accounts
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm">
              Manage your accounts, or click any balance, AER, or monthly savings value to
              quick-edit inline.
            </FLPText>
          </div>
          <FLPButton size="sm" variant="primary" onClick={onOpenAddModal}>
            <FaPlus style={{ marginRight: "6px" }} /> Add Account
          </FLPButton>
        </div>

        {accounts.length === 0 ? (
          <div
            style={{
              padding: "48px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <FaPiggyBank size={40} style={{ color: "var(--colors-text-muted)", opacity: 0.5 }} />
            <FLPHeading as="h5" size="sm">
              No savings accounts found
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm" style={{ maxWidth: "400px" }}>
              Add your savings accounts or investments to track their balances, set monthly deposit
              goals, and forecast your compound growth.
            </FLPText>
            <FLPButton
              size="sm"
              style={{ marginTop: "8px" }}
              variant="primary"
              onClick={onOpenAddModal}
            >
              <FaPlus style={{ marginRight: "6px" }} /> Add Your First Savings Account
            </FLPButton>
          </div>
        ) : isMobileVariant ? (
          <div
            data-testid="savings-accounts-mobile-list"
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {accounts.map((acc) => {
              const bal = Number(acc.balance) || 0;
              const rate = Number(acc.interestRate) || 0;
              const monthly = Number(acc.monthlyContribution) || 0;
              const annualInterest = calculateOneYearCompoundInterest(bal, rate, monthly);

              return (
                <div
                  key={acc.id}
                  className={css({
                    padding: "14px",
                    borderRadius: "lg",
                    border: "1px solid",
                    borderColor: "border",
                    backgroundColor: "background",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  })}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <button
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          color: "var(--colors-text-primary)",
                          textAlign: "left",
                        }}
                        type="button"
                        onClick={() => acc.id && navigate(`/app/accounts/${acc.id}`)}
                      >
                        <FLPText fontSize="sm" fontWeight="bold">
                          {acc.name}
                        </FLPText>
                        <FaExternalLinkAlt
                          size={11}
                          style={{ color: "var(--colors-text-muted)" }}
                        />
                      </button>
                      <div>
                        <span className={badgeStyle(acc.type || "Saving")}>
                          {acc.type || "Saving"}
                        </span>
                      </div>
                    </div>
                    <FLPHeading
                      as="h5"
                      isMobile
                      size="md"
                      style={{ color: "var(--colors-text-primary)" }}
                    >
                      {formatCurrency(bal)}
                    </FLPHeading>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "8px",
                      padding: "10px",
                      borderRadius: "8px",
                      backgroundColor: "var(--colors-surface)",
                    }}
                  >
                    <div>
                      <FLPText color="text.muted" fontSize="xs">
                        AER
                      </FLPText>
                      <FLPText fontSize="xs" fontWeight="semibold">
                        {rate.toFixed(2)}%
                      </FLPText>
                    </div>
                    <div>
                      <FLPText color="text.muted" fontSize="xs">
                        Monthly
                      </FLPText>
                      <FLPText
                        fontSize="xs"
                        fontWeight="semibold"
                        style={{ color: "var(--colors-primary)" }}
                      >
                        +{formatCurrency(monthly)}
                      </FLPText>
                    </div>
                    <div>
                      <FLPText color="text.muted" fontSize="xs">
                        Est. Interest
                      </FLPText>
                      <FLPText
                        fontSize="xs"
                        fontWeight="semibold"
                        style={{ color: "var(--colors-status-positive-text)" }}
                      >
                        ~{formatCurrency(Math.round(annualInterest))}/yr
                      </FLPText>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                    <button
                      aria-label={`Edit ${acc.name}`}
                      className={actionBtnStyle}
                      type="button"
                      onClick={() => setEditingAccount(acc)}
                    >
                      <FaEdit size={14} />
                    </button>
                    <button
                      aria-label={`Delete ${acc.name}`}
                      className={deleteBtnStyle}
                      type="button"
                      onClick={() => acc.id && setConfirmDeleteId(acc.id)}
                    >
                      <FaTrash size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={tableContainerStyle}>
            <table className={tableStyle}>
              <thead>
                <tr>
                  <th className={thStyle}>Account</th>
                  <th className={thStyle}>Type</th>
                  <th className={thStyle} style={{ textAlign: "right" }}>
                    Current balance
                  </th>
                  <th className={thStyle} style={{ textAlign: "right" }}>
                    Interest rate (AER)
                  </th>
                  <th className={thStyle} style={{ textAlign: "right" }}>
                    Monthly savings
                  </th>
                  <th className={thStyle} style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    Est. annual interest
                  </th>
                  <th className={thStyle} style={{ textAlign: "center", width: "110px" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => {
                  const bal = Number(acc.balance) || 0;
                  const rate = Number(acc.interestRate) || 0;
                  const monthly = Number(acc.monthlyContribution) || 0;
                  const annualInterest = calculateOneYearCompoundInterest(bal, rate, monthly);

                  const isEditingBal =
                    inlineEdit?.accountId === acc.id && inlineEdit?.field === "balance";
                  const isEditingRate =
                    inlineEdit?.accountId === acc.id && inlineEdit?.field === "interestRate";
                  const isEditingMonthly =
                    inlineEdit?.accountId === acc.id && inlineEdit?.field === "monthlyContribution";

                  return (
                    <tr key={acc.id} className={trStyle}>
                      <td className={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {acc.type === "Investment" ? (
                            <FaChartLine
                              style={{
                                color: "var(--colors-chart-accent-purple)",
                                fontSize: "16px",
                              }}
                            />
                          ) : (
                            <FaPiggyBank
                              style={{
                                color: "var(--colors-status-positive-text)",
                                fontSize: "16px",
                              }}
                            />
                          )}
                          <button
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              color: "var(--colors-text-primary)",
                            }}
                            title="View monthly balance history"
                            type="button"
                            onClick={() => acc.id && navigate(`/app/accounts/${acc.id}`)}
                          >
                            <FLPText fontSize="sm" fontWeight="semibold">
                              {acc.name}
                            </FLPText>
                            <FaExternalLinkAlt
                              size={10}
                              style={{ color: "var(--colors-text-muted)", opacity: 0.6 }}
                            />
                          </button>
                        </div>
                      </td>
                      <td className={tdStyle}>
                        <span className={badgeStyle(acc.type || "Saving")}>
                          {acc.type === "Investment" ? "Investment" : "Saving"}
                        </span>
                      </td>
                      <td className={tdStyle} style={{ textAlign: "right", fontWeight: "medium" }}>
                        {isEditingBal ? (
                          <input
                            ref={(el) => el?.focus()}
                            className={inlineInputStyle}
                            min="0"
                            step="any"
                            type="number"
                            value={inlineEdit.value}
                            onBlur={commitInlineEdit}
                            onChange={(e) =>
                              setInlineEdit({ ...inlineEdit, value: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitInlineEdit();
                              if (e.key === "Escape") setInlineEdit(null);
                            }}
                          />
                        ) : (
                          <button
                            className={editableCellStyle}
                            type="button"
                            aria-label={`Edit balance for ${acc.name}`}
                            title="Click to quick-edit balance"
                            onClick={() =>
                              acc.id &&
                              setInlineEdit({
                                accountId: acc.id,
                                field: "balance",
                                value: String(bal),
                              })
                            }
                          >
                            {formatCurrency(bal)}
                          </button>
                        )}
                      </td>
                      <td className={tdStyle} style={{ textAlign: "right" }}>
                        {isEditingRate ? (
                          <input
                            ref={(el) => el?.focus()}
                            className={inlineInputStyle}
                            max="100"
                            min="0"
                            step="0.05"
                            type="number"
                            value={inlineEdit.value}
                            onBlur={commitInlineEdit}
                            onChange={(e) =>
                              setInlineEdit({ ...inlineEdit, value: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitInlineEdit();
                              if (e.key === "Escape") setInlineEdit(null);
                            }}
                          />
                        ) : (
                          <button
                            className={editableCellStyle}
                            type="button"
                            aria-label={`Edit interest rate for ${acc.name}`}
                            title="Click to quick-edit AER %"
                            onClick={() =>
                              acc.id &&
                              setInlineEdit({
                                accountId: acc.id,
                                field: "interestRate",
                                value: String(rate),
                              })
                            }
                          >
                            {rate > 0 ? (
                              <span
                                style={{
                                  color: "var(--colors-text-primary)",
                                  fontWeight: "medium",
                                }}
                              >
                                {rate.toFixed(2)}%
                              </span>
                            ) : (
                              <span style={{ color: "var(--colors-text-muted)" }}>0.00%</span>
                            )}
                          </button>
                        )}
                      </td>
                      <td className={tdStyle} style={{ textAlign: "right" }}>
                        {isEditingMonthly ? (
                          <input
                            ref={(el) => el?.focus()}
                            className={inlineInputStyle}
                            min="0"
                            step="10"
                            type="number"
                            value={inlineEdit.value}
                            onBlur={commitInlineEdit}
                            onChange={(e) =>
                              setInlineEdit({ ...inlineEdit, value: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitInlineEdit();
                              if (e.key === "Escape") setInlineEdit(null);
                            }}
                          />
                        ) : (
                          <button
                            className={editableCellStyle}
                            type="button"
                            aria-label={`Edit monthly contribution for ${acc.name}`}
                            title="Click to quick-edit monthly contribution"
                            onClick={() =>
                              acc.id &&
                              setInlineEdit({
                                accountId: acc.id,
                                field: "monthlyContribution",
                                value: String(monthly),
                              })
                            }
                          >
                            {monthly > 0 ? (
                              <span
                                style={{ color: "var(--colors-primary)", fontWeight: "medium" }}
                              >
                                +{formatCurrency(monthly)}
                                <span
                                  style={{ fontSize: "11px", color: "var(--colors-text-muted)" }}
                                >
                                  /mo
                                </span>
                              </span>
                            ) : (
                              <span style={{ color: "var(--colors-text-muted)" }}>
                                {formatCurrency(0)}/mo
                              </span>
                            )}
                          </button>
                        )}
                      </td>
                      <td
                        className={tdStyle}
                        style={{ textAlign: "right", color: "var(--colors-text-muted)" }}
                      >
                        ~{formatCurrency(Math.round(annualInterest))}/yr
                      </td>
                      <td className={tdStyle}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                          }}
                        >
                          <button
                            aria-label={`Edit ${acc.name}`}
                            className={actionBtnStyle}
                            title="Edit Account"
                            type="button"
                            onClick={() => setEditingAccount(acc)}
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            aria-label={`Delete ${acc.name}`}
                            className={deleteBtnStyle}
                            title="Delete Account"
                            type="button"
                            onClick={() => setConfirmDeleteId(acc.id || null)}
                          >
                            <FaTrash size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {accounts.length > 1 && (
                <tfoot>
                  <tr className={tfootRowStyle}>
                    <td className={tdStyle} colSpan={2}>
                      Total ({accounts.length} accounts)
                    </td>
                    <td className={tdStyle} style={{ textAlign: "right" }}>
                      {formatCurrency(summaryTotals.totalBal)}
                    </td>
                    <td className={tdStyle} style={{ textAlign: "right" }}>
                      {summaryTotals.weightedApy.toFixed(2)}%{" "}
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--colors-text-muted)",
                          fontWeight: "normal",
                        }}
                      >
                        avg
                      </span>
                    </td>
                    <td
                      className={tdStyle}
                      style={{ textAlign: "right", color: "var(--colors-primary)" }}
                    >
                      +{formatCurrency(summaryTotals.totalMonthly)}
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--colors-text-muted)",
                          fontWeight: "normal",
                        }}
                      >
                        /mo
                      </span>
                    </td>
                    <td
                      className={tdStyle}
                      style={{ textAlign: "right", color: "var(--colors-status-positive-text)" }}
                    >
                      ~{formatCurrency(Math.round(summaryTotals.totalAnnualInt))}/yr
                    </td>
                    <td className={tdStyle} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </FLPCard>

      <ConfirmDialog
        open={accountToDelete !== undefined}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDeleteId(null);
            deleteOutcome.dismiss();
          }
        }}
        pending={deleteOutcome.pending}
        error={deleteOutcome.error}
        title={`Delete ${accountToDelete?.name ?? "account"}?`}
        description="This deletes the savings account and its history. This can't be undone."
        confirmLabel="Delete account"
        tone="danger"
        onConfirm={() => {
          if (confirmDeleteId) handleConfirmDelete(confirmDeleteId);
        }}
      />

      {editingAccount && (
        <AddSavingsAccountDialog
          accountToEdit={editingAccount}
          isOpen={true}
          onClose={() => setEditingAccount(null)}
        />
      )}
    </>
  );
};

export default SavingsAccountsList;
