import {
  Button,
  Card,
  CollapsibleDrawer,
  EmptyState,
  Icon,
  Illustration,
  Money,
  Num,
  StatusBadge,
  Table,
  TBody,
  Td,
  THead,
  Th,
  VisuallyHidden,
} from "@repo/ui";
import { ExternalLink, LineChart, Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";
import { type FC, type ReactNode, useMemo, useState } from "react";
import { useFetcher, useNavigate } from "react-router";
import type { Account } from "~/containers/accounts/types";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import { calculateOneYearCompoundInterest } from "../../interest";
import { AddSavingsAccountDialog } from "../AddSavingsAccountDialog";
import {
  accountCell,
  accountIcon,
  accountLink,
  actionsCell,
  drawerWrap,
  editableCell,
  inlineInput,
  layoutDesktop,
  layoutMobile,
  listHeader,
  listMeta,
  listRoot,
  listTitle,
  mobileActions,
  mobileCard,
  mobileFigure,
  mobileFigureLabel,
  mobileFigures,
  mobileIdentity,
  mobileList,
  mobileTop,
  mutedFigure,
} from "./SavingsAccountsList.styles";

export interface SavingsAccountsListProps {
  accounts: Account[];
  onOpenAddModal: () => void;
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
}

type InlineField = "balance" | "interestRate" | "monthlyContribution";

interface InlineEdit {
  accountId: string;
  field: InlineField;
  value: string;
}

/** Law 3: a table over eight rows keeps the rest behind a drawer. */
const VISIBLE_ROWS = 8;

const FIELD_STEP: Record<InlineField, string> = {
  balance: "any",
  interestRate: "0.05",
  monthlyContribution: "10",
};

const typeLabel = (acc: Account) => (acc.type === "Investment" ? "Investment" : "Savings");

const TypeBadge: FC<{ account: Account }> = ({ account }) => (
  <StatusBadge size="sm" variant={account.type === "Investment" ? "brand" : "neutral"}>
    {typeLabel(account)}
  </StatusBadge>
);

/** Stable ref callback so the inline input takes focus once, not on every render. */
const focusOnMount = (el: HTMLInputElement | null) => {
  el?.focus();
};

export const SavingsAccountsList: FC<SavingsAccountsListProps> = ({
  accounts,
  onOpenAddModal,
  isMobile: propIsMobile,
  variant,
}) => {
  // Without an explicit variant both layouts render and CSS shows the one that fits the width.
  const forcedLayout: "mobile" | "desktop" | null =
    propIsMobile !== undefined ? (propIsMobile ? "mobile" : "desktop") : (variant ?? null);
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const deleteOutcome = useFetcherOutcome(fetcher, { onSuccess: () => setConfirmDeleteId(null) });
  const [inlineEdit, setInlineEdit] = useState<InlineEdit | null>(null);

  const handleConfirmDelete = (accountId: string) => {
    deleteOutcome.begin();
    fetcher.submit(
      { intent: "deleteAccount", accountId },
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

  const summary = useMemo(() => {
    let totalBal = 0;
    let weightedSum = 0;
    for (const acc of accounts) {
      const bal = Number(acc.balance) || 0;
      totalBal += bal;
      weightedSum += bal * (Number(acc.interestRate) || 0);
    }
    const averageRate =
      totalBal > 0
        ? weightedSum / totalBal
        : accounts.length > 0
          ? accounts.reduce((s, a) => s + (Number(a.interestRate) || 0), 0) / accounts.length
          : 0;
    return { totalBal, averageRate };
  }, [accounts]);

  const renderEditable = (acc: Account, field: InlineField, display: ReactNode, label: string) => {
    const active = inlineEdit?.accountId === acc.id && inlineEdit.field === field;
    if (active && inlineEdit) {
      return (
        <input
          ref={focusOnMount}
          aria-label={label}
          className={inlineInput()}
          max={field === "interestRate" ? "100" : undefined}
          min="0"
          step={FIELD_STEP[field]}
          type="number"
          value={inlineEdit.value}
          onBlur={commitInlineEdit}
          onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitInlineEdit();
            if (e.key === "Escape") setInlineEdit(null);
          }}
        />
      );
    }
    const current = Number(acc[field]) || 0;
    return (
      <button
        className={editableCell()}
        title="Select to edit"
        type="button"
        onClick={() =>
          acc.id && setInlineEdit({ accountId: acc.id, field, value: String(current) })
        }
      >
        <VisuallyHidden>{label}: </VisuallyHidden>
        {display}
      </button>
    );
  };

  const renderRows = (rows: Account[]) => (
    <Table caption="Savings and investment accounts">
      <THead>
        <tr>
          <Th>Account</Th>
          <Th>Type</Th>
          <Th numeric>Balance</Th>
          <Th numeric>Interest rate (AER)</Th>
          <Th numeric>Saved each month</Th>
          <Th numeric>Interest in a year</Th>
          <Th>
            <VisuallyHidden>Actions</VisuallyHidden>
          </Th>
        </tr>
      </THead>
      <TBody>
        {rows.map((acc) => {
          const bal = Number(acc.balance) || 0;
          const rate = Number(acc.interestRate) || 0;
          const monthly = Number(acc.monthlyContribution) || 0;
          const annualInterest = calculateOneYearCompoundInterest(bal, rate, monthly);
          return (
            <tr key={acc.id}>
              <Td>
                <div className={accountCell()}>
                  <span className={accountIcon()}>
                    <Icon icon={acc.type === "Investment" ? LineChart : PiggyBank} size="md" />
                  </span>
                  <button
                    className={accountLink()}
                    title="View monthly balance history"
                    type="button"
                    onClick={() => acc.id && navigate(`/app/accounts/${acc.id}`)}
                  >
                    {acc.name}
                    <Icon icon={ExternalLink} size="sm" />
                  </button>
                </div>
              </Td>
              <Td>
                <TypeBadge account={acc} />
              </Td>
              <Td numeric>
                {renderEditable(
                  acc,
                  "balance",
                  <Money fractionDigits={2} size="sm" value={bal} />,
                  `Edit balance for ${acc.name}`,
                )}
              </Td>
              <Td numeric>
                {renderEditable(
                  acc,
                  "interestRate",
                  <Num fractionDigits={2} kind="percent" size="sm" value={rate} />,
                  `Edit interest rate for ${acc.name}`,
                )}
              </Td>
              <Td numeric>
                {renderEditable(
                  acc,
                  "monthlyContribution",
                  <Money fractionDigits={0} size="sm" value={monthly} />,
                  `Edit monthly contribution for ${acc.name}`,
                )}
              </Td>
              <Td numeric>
                <span className={mutedFigure()}>
                  <Money size="sm" tone="muted" value={Math.round(annualInterest)} />
                </span>
              </Td>
              <Td>
                <div className={actionsCell()}>
                  <Button
                    aria-label={`Edit ${acc.name}`}
                    size="sm"
                    title="Edit account"
                    variant="ghost"
                    onClick={() => setEditingAccount(acc)}
                  >
                    <Icon icon={Pencil} size="sm" />
                  </Button>
                  <Button
                    aria-label={`Delete ${acc.name}`}
                    size="sm"
                    title="Delete account"
                    variant="ghost"
                    onClick={() => setConfirmDeleteId(acc.id || null)}
                  >
                    <Icon icon={Trash2} size="sm" />
                  </Button>
                </div>
              </Td>
            </tr>
          );
        })}
      </TBody>
    </Table>
  );

  const visible = accounts.slice(0, VISIBLE_ROWS);
  const rest = accounts.slice(VISIBLE_ROWS);

  const mobileLayout = (
    <div
      className={mobileList()}
      data-testid="savings-accounts-mobile-list"
      id="savings-accounts-mobile-list"
    >
      {accounts.map((acc) => {
        const bal = Number(acc.balance) || 0;
        const rate = Number(acc.interestRate) || 0;
        const monthly = Number(acc.monthlyContribution) || 0;
        const annualInterest = calculateOneYearCompoundInterest(bal, rate, monthly);
        return (
          <div key={acc.id} className={mobileCard()}>
            <div className={mobileTop()}>
              <div className={mobileIdentity()}>
                <button
                  className={accountLink()}
                  type="button"
                  onClick={() => acc.id && navigate(`/app/accounts/${acc.id}`)}
                >
                  {acc.name}
                  <Icon icon={ExternalLink} size="sm" />
                </button>
                <TypeBadge account={acc} />
              </div>
              <Money fractionDigits={2} size="md" value={bal} />
            </div>
            <div className={mobileFigures()}>
              <div className={mobileFigure()}>
                <span className={mobileFigureLabel()}>AER</span>
                <Num fractionDigits={2} kind="percent" size="sm" value={rate} />
              </div>
              <div className={mobileFigure()}>
                <span className={mobileFigureLabel()}>Each month</span>
                <Money fractionDigits={0} size="sm" value={monthly} />
              </div>
              <div className={mobileFigure()}>
                <span className={mobileFigureLabel()}>Interest a year</span>
                <Money size="sm" value={Math.round(annualInterest)} />
              </div>
            </div>
            <div className={mobileActions()}>
              <Button
                aria-label={`Edit ${acc.name}`}
                size="sm"
                variant="ghost"
                onClick={() => setEditingAccount(acc)}
              >
                <Icon icon={Pencil} size="sm" />
              </Button>
              <Button
                aria-label={`Delete ${acc.name}`}
                size="sm"
                variant="ghost"
                onClick={() => acc.id && setConfirmDeleteId(acc.id)}
              >
                <Icon icon={Trash2} size="sm" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const desktopLayout = (
    <Card padding="none">
      {renderRows(visible)}
      {rest.length > 0 && (
        <div className={drawerWrap()}>
          <CollapsibleDrawer
            closedLabel="Show all"
            openLabel="Show fewer"
            title={`${rest.length} more ${rest.length === 1 ? "account" : "accounts"}`}
          >
            {renderRows(rest)}
          </CollapsibleDrawer>
        </div>
      )}
    </Card>
  );

  return (
    <section aria-labelledby="savings-accounts-heading" className={listRoot()}>
      <div className={listHeader()}>
        <div>
          <h2 className={listTitle()} id="savings-accounts-heading">
            Your accounts
          </h2>
          {accounts.length > 0 && (
            <p className={listMeta()}>
              <span>{accounts.length === 1 ? "1 account" : `${accounts.length} accounts`}</span>
              <span aria-hidden="true">·</span>
              <Money size="sm" value={summary.totalBal} />
              <span aria-hidden="true">·</span>
              <Num fractionDigits={2} kind="percent" size="sm" value={summary.averageRate} />
              <span>average AER</span>
            </p>
          )}
        </div>
      </div>

      {accounts.length === 0 ? (
        <Card padding="none">
          <EmptyState
            action={
              <Button onClick={onOpenAddModal}>
                <Icon icon={Plus} size="sm" />
                Add your first account
              </Button>
            }
            description="Add a savings account or investment to see its balance, what you put in each month and where it could get to."
            headingLevel="h3"
            illustration={<Illustration scene="onboarding" />}
            title="No savings accounts yet"
          />
        </Card>
      ) : forcedLayout === "mobile" ? (
        mobileLayout
      ) : forcedLayout === "desktop" ? (
        desktopLayout
      ) : (
        <>
          <div className={layoutMobile()}>{mobileLayout}</div>
          <div className={layoutDesktop()}>{desktopLayout}</div>
        </>
      )}

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
    </section>
  );
};

export default SavingsAccountsList;
