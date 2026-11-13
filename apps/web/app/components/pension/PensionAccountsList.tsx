import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
import {
  FaEdit,
  FaExternalLinkAlt,
  FaInfoCircle,
  FaPiggyBank,
  FaPlus,
  FaTrash,
} from "react-icons/fa";
import { useFetcher } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import type { Account } from "~/containers/accounts/types";
import { useResponsive } from "~/context/ResponsiveContext";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import AddPensionAccountDialog from "./AddPensionAccountDialog";

export interface PensionAccountsListProps {
  accounts: Account[];
  onOpenAddModal: () => void;
  onOpenWizard?: () => void;
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
}

const POT_COLORS = ["#8b5cf6", "#6363f1", "#10b981", "#f59e0b", "#ec4899", "#3b82f6", "#14b8a6"];

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
    backgroundColor: "rgba(139, 92, 246, 0.03)",
  },
});

const tdStyle = css({
  padding: "16px",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
});

const currentBadgeStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "3px 8px",
  borderRadius: "full",
  fontSize: "xs",
  fontWeight: "medium",
  backgroundColor: "rgba(139, 92, 246, 0.12)",
  color: "#8b5cf6",
});

const pastBadgeStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "3px 8px",
  borderRadius: "full",
  fontSize: "xs",
  fontWeight: "medium",
  backgroundColor: "rgba(100, 116, 139, 0.12)",
  color: "text.muted",
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
    backgroundColor: "rgba(99, 99, 241, 0.08)",
  },
});

const potLinkStyle = css({
  fontWeight: 600,
  color: "text.primary",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  transition: "color 0.15s ease",
  _hover: {
    color: "primary",
  },
});

export const PensionAccountsList: FC<PensionAccountsListProps> = ({
  accounts,
  onOpenAddModal,
  onOpenWizard,
  isMobile: propIsMobile,
  variant = "desktop",
}) => {
  const fetcher = useFetcher();
  const { formatCurrency } = useFormatCurrency();
  const { isMobile: contextIsMobile } = useResponsive();
  const isMobileVariant = propIsMobile ?? (variant === "mobile" ? true : contextIsMobile);

  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const deleteOutcome = useFetcherOutcome(fetcher, { onSuccess: () => setAccountToDelete(null) });

  const totalBalance = useMemo(
    () => accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0),
    [accounts],
  );

  const smallPotsCount = useMemo(
    () =>
      accounts.length >= 2
        ? accounts.filter((acc) => {
            const bal = Number(acc.balance) || 0;
            return bal > 0 && bal < 5000;
          }).length
        : 0,
    [accounts],
  );

  const currentPotsCount = useMemo(
    () => accounts.filter((acc) => acc.isCurrent !== false).length,
    [accounts],
  );

  const pastPotsCount = useMemo(
    () => accounts.filter((acc) => acc.isCurrent === false).length,
    [accounts],
  );

  const handleEdit = (acc: Account) => {
    setEditingAccount(acc);
    setIsEditModalOpen(true);
  };

  const confirmDelete = () => {
    if (!accountToDelete?.id) return;
    deleteOutcome.begin();
    fetcher.submit(
      {
        intent: "deletePensionAccount",
        accountId: accountToDelete.id,
      },
      { method: "POST", action: "/app/pension" },
    );
  };

  return (
    <>
      <FLPCard className={cardStyle}>
        <div className={headerRowStyle}>
          <div>
            <FLPHeading as="h2" size="md">
              Your Pension Pots
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm">
              Keep track of workplace pensions, personal SIPPs, and previous employer schemes
            </FLPText>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <FLPButton size="sm" variant="primary" onClick={onOpenAddModal}>
              <FaPlus style={{ marginRight: "6px" }} /> Add Pension Pot
            </FLPButton>
          </div>
        </div>

        {/* Multi-pot allocation bar */}
        {accounts.length >= 2 && totalBalance > 0 && (
          <div
            className={css({
              padding: "14px 16px",
              borderRadius: "lg",
              backgroundColor: "rgba(139, 92, 246, 0.03)",
              border: "1px solid",
              borderColor: "border",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            })}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <FLPText
                color="text.muted"
                fontSize="xs"
                fontWeight="semibold"
                textTransform="uppercase"
              >
                Pot Allocation Breakdown
              </FLPText>
              <FLPText color="text.muted" fontSize="xs">
                {accounts.length} pots ({currentPotsCount} current
                {pastPotsCount > 0 ? `, ${pastPotsCount} past` : ""}) ·{" "}
                {formatCurrency(totalBalance)} total
              </FLPText>
            </div>
            <div
              style={{
                display: "flex",
                height: "10px",
                width: "100%",
                borderRadius: "999px",
                overflow: "hidden",
                backgroundColor: "var(--colors-border)",
              }}
            >
              {accounts.map((acc, idx) => {
                const bal = Number(acc.balance) || 0;
                const pct = totalBalance > 0 ? (bal / totalBalance) * 100 : 0;
                const color = POT_COLORS[idx % POT_COLORS.length];
                return (
                  <div
                    key={acc.id || acc.name}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: color,
                      height: "100%",
                      transition: "width 0.3s ease",
                    }}
                    title={`${acc.name}: ${formatCurrency(bal)} (${pct.toFixed(1)}%)`}
                  />
                );
              })}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px" }}>
              {accounts.map((acc, idx) => {
                const bal = Number(acc.balance) || 0;
                const pct = totalBalance > 0 ? (bal / totalBalance) * 100 : 0;
                const color = POT_COLORS[idx % POT_COLORS.length];
                return (
                  <div
                    key={acc.id || acc.name}
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
                  >
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: color,
                        display: "inline-block",
                      }}
                    />
                    <span style={{ fontWeight: 500 }}>{acc.name}</span>
                    <span style={{ color: "var(--colors-text-muted)" }}>({pct.toFixed(0)}%)</span>
                  </div>
                );
              })}
            </div>
            {(smallPotsCount > 0 || pastPotsCount > 0) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  color: "#8b5cf6",
                  marginTop: "2px",
                }}
              >
                <FaInfoCircle style={{ flexShrink: 0 }} />
                <span>
                  <strong>Consolidation Tip:</strong>{" "}
                  {pastPotsCount > 0
                    ? `You have ${pastPotsCount} past pension ${pastPotsCount === 1 ? "pot" : "pots"}. Combining legacy employer pots into your active scheme or SIPP can simplify tracking and avoid duplicate fees.`
                    : `You have ${smallPotsCount} ${smallPotsCount === 1 ? "pot" : "pots"} under £5,000. Combining legacy employer pots into a single pension or SIPP can simplify management and lower annual platform fees.`}
                </span>
              </div>
            )}
          </div>
        )}

        {accounts.length === 0 ? (
          <div
            className={css({
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              padding: "12px 16px",
              backgroundColor: "surface.sunken",
              borderRadius: "xl",
              borderWidth: "1px",
              borderStyle: "dashed",
              borderColor: "border.subtle",
            })}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <FaPiggyBank style={{ color: "var(--colors-text-muted)", fontSize: "16px" }} />
              <FLPText color="text.muted" fontSize="sm">
                No individual pension pots tracked yet. Baseline contributions are modeled from your
                salary.
              </FLPText>
            </div>
            <FLPButton size="sm" variant="outline" onClick={onOpenAddModal}>
              <FaPlus style={{ marginRight: "6px" }} /> Add Pension Pot
            </FLPButton>
          </div>
        ) : isMobileVariant ? (
          <div
            data-testid="pension-accounts-mobile-list"
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {accounts.map((acc, idx) => {
              const bal = Number(acc.balance) || 0;
              const rate =
                acc.interestRate !== undefined && acc.interestRate !== null
                  ? Number(acc.interestRate)
                  : 7;
              const isCurrent = acc.isCurrent !== false;
              const directMonthly = isCurrent ? Number(acc.monthlyContribution) || 0 : 0;
              const sharePct = totalBalance > 0 ? (bal / totalBalance) * 100 : 0;
              const potColor = POT_COLORS[idx % POT_COLORS.length];

              return (
                <div
                  key={acc.id || acc.name}
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
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            backgroundColor: potColor,
                            flexShrink: 0,
                          }}
                        />
                        <FLPText fontSize="sm" fontWeight="bold">
                          {acc.name}
                        </FLPText>
                      </div>
                      <span className={isCurrent ? currentBadgeStyle : pastBadgeStyle}>
                        {isCurrent ? "Current Pot" : "Past Pot"}
                      </span>
                    </div>
                    <FLPHeading as="h3" isMobile size="md" style={{ color: "#8b5cf6" }}>
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
                        Share
                      </FLPText>
                      <FLPText fontSize="xs" fontWeight="semibold">
                        {sharePct.toFixed(1)}%
                      </FLPText>
                    </div>
                    <div>
                      <FLPText color="text.muted" fontSize="xs">
                        Return
                      </FLPText>
                      <FLPText
                        fontSize="xs"
                        fontWeight="semibold"
                        style={{ color: "var(--colors-status-positive-text)" }}
                      >
                        {rate.toFixed(1)}%/yr
                      </FLPText>
                    </div>
                    <div>
                      <FLPText color="text.muted" fontSize="xs">
                        Direct Inflow
                      </FLPText>
                      <FLPText
                        color={!isCurrent ? "text.muted" : undefined}
                        fontSize="xs"
                        fontWeight="semibold"
                      >
                        {!isCurrent
                          ? "None (Past)"
                          : directMonthly > 0
                            ? `+${formatCurrency(directMonthly)}/mo`
                            : "Salary %"}
                      </FLPText>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                    <button
                      aria-label={`Edit ${acc.name}`}
                      className={actionBtnStyle}
                      type="button"
                      onClick={() => handleEdit(acc)}
                    >
                      <FaEdit size={14} />
                    </button>
                    <button
                      aria-label={`Delete ${acc.name}`}
                      className={actionBtnStyle}
                      style={{ color: "var(--colors-status-danger-text)" }}
                      type="button"
                      onClick={() => setAccountToDelete(acc)}
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
                  <th className={thStyle}>Pot Name</th>
                  <th className={thStyle}>Status</th>
                  <th className={thStyle}>Current Balance</th>
                  <th className={thStyle}>Share</th>
                  <th className={thStyle}>Expected Return</th>
                  <th className={thStyle}>Direct Contrib</th>
                  <th className={thStyle} style={{ textAlign: "right" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc, idx) => {
                  const balanceNum = Number(acc.balance) || 0;
                  const sharePct = totalBalance > 0 ? (balanceNum / totalBalance) * 100 : 0;
                  const returnRate =
                    acc.interestRate !== undefined && acc.interestRate !== null
                      ? Number(acc.interestRate)
                      : 5.0;
                  const isCurrent = acc.isCurrent !== false;
                  const directMonthly = isCurrent
                    ? acc.monthlyContribution !== undefined && acc.monthlyContribution !== null
                      ? Number(acc.monthlyContribution)
                      : 0
                    : 0;
                  const dotColor = POT_COLORS[idx % POT_COLORS.length];

                  return (
                    <tr key={acc.id} className={trStyle}>
                      <td className={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              backgroundColor: dotColor,
                              flexShrink: 0,
                            }}
                          />
                          {acc.id ? (
                            <a
                              className={potLinkStyle}
                              href={`/app/accounts/${acc.id}`}
                              title="View monthly balance history"
                            >
                              <span>{acc.name}</span>
                              <FaExternalLinkAlt style={{ fontSize: "10px", opacity: 0.5 }} />
                            </a>
                          ) : (
                            <span style={{ fontWeight: 600 }}>{acc.name}</span>
                          )}
                        </div>
                      </td>
                      <td className={tdStyle}>
                        <span className={isCurrent ? currentBadgeStyle : pastBadgeStyle}>
                          {isCurrent ? "Current Pot" : "Past Pot"}
                        </span>
                      </td>
                      <td className={tdStyle}>
                        <span style={{ fontWeight: 700, fontSize: "15px" }}>
                          {formatCurrency(balanceNum)}
                        </span>
                      </td>
                      <td className={tdStyle}>
                        <span style={{ color: "var(--colors-text-muted)", fontSize: "13px" }}>
                          {sharePct.toFixed(1)}%
                        </span>
                      </td>
                      <td className={tdStyle}>
                        <span style={{ color: "var(--colors-text-primary)", fontWeight: 500 }}>
                          {returnRate.toFixed(1)}% p.a.
                        </span>
                      </td>
                      <td className={tdStyle}>
                        <span
                          style={{
                            color:
                              !isCurrent || directMonthly <= 0
                                ? "var(--colors-text-muted)"
                                : "var(--colors-text-primary)",
                          }}
                        >
                          {!isCurrent
                            ? "None (Past Pot)"
                            : directMonthly > 0
                              ? `${formatCurrency(directMonthly)}/mo`
                              : "Salary %"}
                        </span>
                      </td>
                      <td className={tdStyle} style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            aria-label={`Edit ${acc.name}`}
                            className={actionBtnStyle}
                            title="Edit Pot"
                            type="button"
                            onClick={() => handleEdit(acc)}
                          >
                            <FaEdit />
                          </button>
                          <button
                            aria-label={`Delete ${acc.name}`}
                            className={actionBtnStyle}
                            style={{ color: "var(--colors-status-danger-text)" }}
                            title="Delete Pot"
                            type="button"
                            onClick={() => setAccountToDelete(acc)}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </FLPCard>

      {/* Edit Pot Modal */}
      {isEditModalOpen && (
        <AddPensionAccountDialog
          accountToEdit={editingAccount}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingAccount(null);
          }}
        />
      )}

      <ConfirmDialog
        open={accountToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAccountToDelete(null);
            deleteOutcome.dismiss();
          }
        }}
        pending={deleteOutcome.pending}
        error={deleteOutcome.error}
        title={`Delete ${accountToDelete?.name || "this pension pot"}?`}
        description="This deletes the pension pot and its history. This can't be undone."
        confirmLabel="Delete pot"
        tone="danger"
        onConfirm={confirmDelete}
      />
    </>
  );
};

export default PensionAccountsList;
