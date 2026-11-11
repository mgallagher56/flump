import * as Dialog from "@radix-ui/react-dialog";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useState } from "react";
import { FaCheckCircle, FaClock, FaTimes } from "react-icons/fa";
import { useFetcher } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import type { Account } from "~/containers/accounts/types";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { currentMonth, currentYear } from "~/utils/utils";

interface MonthlyBalanceCheckInDrawerProps {
  accounts: Account[];
}

export const MonthlyBalanceCheckInDrawer: FC<MonthlyBalanceCheckInDrawerProps> = ({ accounts }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { formatCurrency } = useFormatCurrency();
  const fetcher = useFetcher();

  // Local state for updated balances
  const [balanceMap, setBalanceMap] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const acc of accounts) {
      initial[acc.id] = String(acc.balance ?? 0);
    }
    return initial;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleOpen = (open: boolean) => {
    if (open) {
      const initial: Record<string, string> = {};
      for (const acc of accounts) {
        initial[acc.id] = String(acc.balance ?? 0);
      }
      setBalanceMap(initial);
      setSavedSuccess(false);
    }
    setIsOpen(open);
  };

  const handleBalanceChange = (id: string, val: string) => {
    setBalanceMap((prev) => ({ ...prev, [id]: val }));
  };

  const handleSaveAll = () => {
    // Submit each updated account balance
    for (const acc of accounts) {
      const updatedVal = balanceMap[acc.id];
      if (updatedVal !== undefined && Number(updatedVal) !== Number(acc.balance)) {
        fetcher.submit(
          {
            intent: "update",
            accountId: acc.id,
            name: acc.name,
            type: acc.type,
            balance: updatedVal,
          },
          { method: "post" },
        );
      }
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setIsOpen(false);
      setSavedSuccess(false);
    }, 1200);
  };

  const monthNames = [
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
  const currentMonthName = monthNames[currentMonth] || "Current Month";

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
            backgroundColor: "rgba(99, 99, 241, 0.1)",
            color: "primary",
            border: "1px solid",
            borderColor: "rgba(99, 99, 241, 0.25)",
            cursor: "pointer",
            transition: "all 0.15s ease",
            _hover: {
              backgroundColor: "rgba(99, 99, 241, 0.18)",
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
            backgroundColor: "rgba(0, 0, 0, 0.6)",
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
              <FaCheckCircle className={css({ fontSize: "40px", color: "green.500" })} />
              <FLPHeading as="h3" size="md">
                Balances Updated Successfully!
              </FLPHeading>
              <FLPText color="text.muted" fontSize="sm">
                Your Net Worth and allocation figures have been refreshed.
              </FLPText>
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
                  disabled={accounts.length === 0}
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
