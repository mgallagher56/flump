import { PortfolioSnapshot, type RawAccount, type RawAccountDetail } from "@flump/finance-engine";
import * as Dialog from "@radix-ui/react-dialog";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useRef, useState } from "react";
import { FaCheckCircle, FaClock, FaTimes } from "react-icons/fa";
import { useFetcher } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import type { Account } from "~/containers/accounts/types";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { roundTo2dp } from "~/utils/roundTo2dp";
import { currentMonth, currentYear } from "~/utils/utils";

interface MonthlyBalanceCheckInDrawerProps {
  accounts: Account[];
  /** Month-end history rows; lets the drawer compare against last month's net worth. */
  accountDetails?: RawAccountDetail[];
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export interface CheckInChange {
  /** Signed net worth change in pounds. */
  delta: number;
  /** What the change is measured against, for example "October" or "your last update". */
  since: string;
}

/**
 * Net worth after the check-in minus the baseline. The baseline is last month's month-end net
 * worth when every account (student loans aside, they are outside net worth) has history, and
 * otherwise the net worth from the balances before this check-in.
 */
export function computeCheckInChange(
  accounts: Account[],
  details: RawAccountDetail[],
  updatedBalances: Record<string, number>,
  now: { year: number; month: number } = { year: currentYear, month: currentMonth },
): CheckInChange {
  const before = new PortfolioSnapshot(accounts as RawAccount[], details);
  const after = new PortfolioSnapshot(
    accounts.map((a) => ({
      ...a,
      balance: updatedBalances[a.id as string] ?? a.balance,
    })) as RawAccount[],
    details,
  );
  const afterNetWorth = after.getTotalNetWorth();

  const withHistory = new Set(details.map((d) => String(d.accountId ?? d.account_id)));
  const everyAccountTracked = accounts
    .filter((a) => a.type !== "Student Loan")
    .every((a) => withHistory.has(String(a.id)));
  const nowIndex = now.year * 12 + now.month;
  const lastMonth = everyAccountTracked
    ? before
        .getMonthlyHistory(120)
        .filter((p) => p.year * 12 + p.month < nowIndex)
        .at(-1)
    : undefined;

  if (lastMonth) {
    return {
      delta: roundTo2dp(afterNetWorth - lastMonth.netWorth),
      since: MONTH_NAMES[lastMonth.month - 1] ?? "last month",
    };
  }
  return {
    delta: roundTo2dp(afterNetWorth - before.getTotalNetWorth()),
    since: "your last update",
  };
}

export const MonthlyBalanceCheckInDrawer: FC<MonthlyBalanceCheckInDrawerProps> = ({
  accounts,
  accountDetails = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { formatCurrency, formatCurrencyDecimal } = useFormatCurrency();
  const fetcher = useFetcher<{ success?: boolean; error?: string }>();

  // Local state for updated balances
  const [balanceMap, setBalanceMap] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const acc of accounts) {
      initial[acc.id] = String(acc.balance ?? 0);
    }
    return initial;
  });

  // saving: waiting for the batch response. A result only counts once the fetcher is idle with
  // data that is not the response to an earlier submission.
  const [phase, setPhase] = useState<"editing" | "saving">("editing");
  const [formError, setFormError] = useState<string | null>(null);
  const [change, setChange] = useState<CheckInChange | null>(null);
  const dataAtSubmit = useRef<unknown>(undefined);

  const responded =
    phase === "saving" && fetcher.state === "idle" && fetcher.data !== dataAtSubmit.current;
  const savedSuccess = responded && fetcher.data?.success === true;
  const serverError = responded && fetcher.data?.success !== true;
  const isSaving = phase === "saving" && !responded;

  const handleOpen = (open: boolean) => {
    if (open) {
      const initial: Record<string, string> = {};
      for (const acc of accounts) {
        initial[acc.id] = String(acc.balance ?? 0);
      }
      setBalanceMap(initial);
      setPhase("editing");
      setFormError(null);
      setChange(null);
    }
    setIsOpen(open);
  };

  const handleBalanceChange = (id: string, val: string) => {
    setBalanceMap((prev) => ({ ...prev, [id]: val }));
  };

  const handleSaveAll = () => {
    const updated: Record<string, number> = {};
    for (const acc of accounts) {
      const raw = balanceMap[acc.id as string];
      const value = raw === undefined || raw.trim() === "" ? Number.NaN : Number(raw);
      if (!Number.isFinite(value)) {
        setFormError(`Enter a balance for ${acc.name}.`);
        return;
      }
      updated[acc.id as string] = roundTo2dp(value);
    }
    setFormError(null);
    setChange(computeCheckInChange(accounts, accountDetails, updated));
    dataAtSubmit.current = fetcher.data;
    setPhase("saving");
    // One request for every account: the backend applies it in a single transaction.
    fetcher.submit(
      {
        intent: "checkIn",
        balances: JSON.stringify(
          accounts.map((acc) => ({ id: acc.id, balance: updated[acc.id as string] })),
        ),
      },
      { method: "post" },
    );
  };

  const currentMonthName = MONTH_NAMES[currentMonth - 1] || "Current Month";

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={css({
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "md",
            fontSize: "sm",
            fontWeight: "semibold",
            backgroundColor: "color-mix(in srgb, var(--colors-primary) 10%, transparent)",
            color: "primary",
            border: "1px solid",
            borderColor: "color-mix(in srgb, var(--colors-primary) 25%, transparent)",
            cursor: "pointer",
            transition: "all 0.15s ease",
            _hover: {
              backgroundColor: "color-mix(in srgb, var(--colors-primary) 18%, transparent)",
              borderColor: "primary",
            },
          })}
        >
          <FaClock />
          <span>60-Sec Balance Check-In</span>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay
          className={css({
            position: "fixed",
            inset: 0,
            backgroundColor: "var(--colors-surface-scrim)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
          })}
        />
        <Dialog.Content
          className={css({
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "card",
            border: "1px solid",
            borderColor: "border",
            borderRadius: "xl",
            padding: "28px",
            width: "95vw",
            maxWidth: "680px",
            maxHeight: "85vh",
            overflowY: "auto",
            zIndex: 10000,
            boxShadow: "2xl",
          })}
        >
          <div
            className={css({
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "20px",
              borderBottom: "1px solid",
              borderColor: "border",
              paddingBottom: "16px",
            })}
          >
            <div>
              <Dialog.Title asChild>
                <FLPHeading as="h2" size="lg" color="text.primary">
                  60-Second Monthly Balance Check-In
                </FLPHeading>
              </Dialog.Title>
              <Dialog.Description asChild>
                <FLPText fontSize="sm" color="text.muted" className={css({ marginTop: "4px" })}>
                  Quickly update all manual balances for{" "}
                  <strong>
                    {currentMonthName} {currentYear}
                  </strong>{" "}
                  in one view.
                </FLPText>
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className={css({
                  background: "transparent",
                  border: "none",
                  color: "text.muted",
                  cursor: "pointer",
                  fontSize: "18px",
                  padding: "4px",
                  _hover: { color: "text.primary" },
                })}
              >
                <FaTimes />
              </button>
            </Dialog.Close>
          </div>

          {savedSuccess ? (
            <div
              className={css({
                padding: "32px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
              })}
            >
              <FaCheckCircle className={css({ fontSize: "40px", color: "status.positive.text" })} />
              <FLPHeading as="h3" size="md">
                Balances Updated Successfully!
              </FLPHeading>
              {change ? (
                <FLPText
                  color="text.muted"
                  fontSize="sm"
                  className={css({ fontVariantNumeric: "tabular-nums" })}
                >
                  {change.delta === 0
                    ? `Net worth unchanged since ${change.since}`
                    : `Net worth ${change.delta > 0 ? "up" : "down"} ${formatCurrencyDecimal(Math.abs(change.delta))} since ${change.since}`}
                </FLPText>
              ) : null}
            </div>
          ) : (
            <>
              <div
                className={css({
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  marginBottom: "24px",
                })}
              >
                {accounts.length === 0 ? (
                  <FLPText color="text.muted" fontSize="sm">
                    No accounts found. Create an account first to check in.
                  </FLPText>
                ) : (
                  accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className={css({
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        backgroundColor: "secondary",
                        borderRadius: "lg",
                        border: "1px solid",
                        borderColor: "border",
                      })}
                    >
                      <div className={css({ display: "flex", flexDirection: "column" })}>
                        <FLPText fontWeight="semibold" fontSize="sm" color="text.primary">
                          {acc.name}
                        </FLPText>
                        <FLPText fontSize="xs" color="text.muted">
                          {acc.type} • Previous: {formatCurrency(Number(acc.balance ?? 0))}
                        </FLPText>
                      </div>

                      <div className={css({ display: "flex", alignItems: "center", gap: "6px" })}>
                        <span className={css({ fontSize: "sm", color: "text.muted" })}>£</span>
                        <input
                          type="number"
                          step="0.01"
                          value={balanceMap[acc.id] ?? ""}
                          onChange={(e) => handleBalanceChange(acc.id, e.target.value)}
                          className={css({
                            width: "120px",
                            padding: "6px 10px",
                            borderRadius: "md",
                            border: "1px solid",
                            borderColor: "border",
                            backgroundColor: "card",
                            color: "text.primary",
                            fontSize: "sm",
                            textAlign: "right",
                            fontWeight: "medium",
                            fontVariantNumeric: "tabular-nums",
                            _focus: {
                              borderColor: "primary",
                              outline: "none",
                            },
                          })}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {formError || serverError ? (
                <FLPText role="alert" color="status.danger.text" fontSize="sm">
                  {formError ??
                    fetcher.data?.error ??
                    "We couldn't save your balances. Please try again."}
                </FLPText>
              ) : null}
              <div
                className={css({
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  borderTop: "1px solid",
                  borderColor: "border",
                  paddingTop: "16px",
                })}
              >
                <Dialog.Close asChild>
                  <FLPButton variant="ghost">Cancel</FLPButton>
                </Dialog.Close>
                <FLPButton
                  variant="primary"
                  onClick={handleSaveAll}
                  disabled={accounts.length === 0 || isSaving}
                >
                  Save All Current Balances
                </FLPButton>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default MonthlyBalanceCheckInDrawer;
