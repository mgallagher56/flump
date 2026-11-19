import {
  Button,
  Card,
  CollapsibleDrawer,
  Icon,
  Money,
  PageSection,
  VisuallyHidden,
} from "@repo/ui";
import { Pencil, PiggyBank } from "lucide-react";
import { type FC, useState } from "react";
import { Link, useFetcher } from "react-router";
import type { Account } from "~/containers/accounts/types";
import { ACCOUNT_SUBTYPE_LABEL } from "~/features/accounts/accountSubtypes";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import { AddSavingsAccountDialog } from "../AddSavingsAccountDialog";
import {
  accountLink,
  accountMeta,
  accountName,
  accountType,
  actionsCell,
  balance,
  drawerWrap,
  editLabel,
  row,
  rowEnd,
  rowList,
} from "./SavingsAccountsList.styles";

export interface SavingsAccountsListProps {
  /** Rows to show, with each balance at the user's share. */
  accounts: Account[];
  /**
   * The same accounts as saved, with the whole balance. The edit form starts from these, so a
   * joint account's share is never saved back as its whole balance (SD-1, JO-1).
   */
  savedAccounts?: Account[];
}

/** Law 3: a table over eight rows keeps the rest behind a drawer. */
const VISIBLE_ROWS = 8;

const typeLabel = (acc: Account) =>
  (acc.accountSubtype && ACCOUNT_SUBTYPE_LABEL[acc.accountSubtype]) ||
  (acc.type === "Investment" ? "Investment" : "Savings");

/**
 * "Your accounts": one figure per row, the balance (plan P1.4; a single account's row shows it
 * too, phone audit P65), and one "Edit" button, the same as pension pots. The type line
 * shows only when the list mixes savings and investments. The rate, the amount saved each month and "Delete account" live in the edit
 * dialog; deleting always asks for confirmation.
 */
export const SavingsAccountsList: FC<SavingsAccountsListProps> = ({ accounts, savedAccounts }) => {
  const fetcher = useFetcher();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const deleteOutcome = useFetcherOutcome(fetcher, { onSuccess: () => setConfirmDeleteId(null) });

  const accountToDelete = confirmDeleteId
    ? accounts.find((acc) => acc.id === confirmDeleteId)
    : undefined;

  // The type line only tells rows apart when the list mixes savings and investments.
  const showTypes = new Set(accounts.map(typeLabel)).size > 1;

  // A list, not a table: at 320 to 375 the name wraps onto more lines while the balance and Edit
  // stay right-aligned on the row, so nothing clips or scrolls sideways.
  const renderRows = (rows: Account[]) => (
    <ul aria-label="Savings and investment accounts" className={rowList()}>
      {rows.map((acc) => (
        <li className={row()} data-list-row="" key={acc.id}>
          <span className={accountMeta()}>
            <Link className={accountLink()} to={`/app/accounts/${acc.id}`}>
              <span className={accountName()}>{acc.name}</span>
            </Link>
            {showTypes && <span className={accountType()}>{typeLabel(acc)}</span>}
          </span>
          <span className={rowEnd()}>
            {/* Every row shows its one figure, a single account too, so no row is a bare name (P65). */}
            <span className={balance()}>
              <VisuallyHidden>Balance </VisuallyHidden>
              <Money size="sm" value={Math.round(Number(acc.balance) || 0)} />
            </span>
            <span className={actionsCell()}>
              <Button
                aria-label={`Edit ${acc.name}`}
                size="sm"
                variant="ghost"
                onClick={() => setEditingAccount(acc)}
              >
                <Icon icon={Pencil} size="sm" />
                {/* Icon only below sm, so names keep one line; the aria-label names it. */}
                <span className={editLabel()}>Edit</span>
              </Button>
            </span>
          </span>
        </li>
      ))}
    </ul>
  );

  const visible = accounts.slice(0, VISIBLE_ROWS);
  const rest = accounts.slice(VISIBLE_ROWS);

  return (
    <PageSection
      description="Select edit on an account to see or change its details."
      domain="savings"
      headingId="savings-accounts-heading"
      icon={PiggyBank}
      id="savings-accounts"
      title="Your accounts"
    >
      <Card padding="none">
        {renderRows(visible)}
        {rest.length > 0 && (
          <div className={drawerWrap()}>
            <CollapsibleDrawer
              closedLabel="Show all"
              openLabel="Show fewer"
              title={`${rest.length} more ${rest.length === 1 ? "account" : "accounts"}`}
              variant="quiet"
            >
              {renderRows(rest)}
            </CollapsibleDrawer>
          </div>
        )}
      </Card>

      <ConfirmDialog
        scope="single"
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
        description="Its balance history will be deleted too. This cannot be undone."
        confirmLabel="Delete account"
        tone="danger"
        onConfirm={() => {
          if (!confirmDeleteId) return;
          deleteOutcome.begin();
          fetcher.submit(
            { intent: "deleteAccount", accountId: confirmDeleteId },
            { method: "POST", action: "/app/savings" },
          );
        }}
      />

      {editingAccount && (
        <AddSavingsAccountDialog
          // The saved account as loaded now, so a save after a reload sends its latest version.
          accountToEdit={
            savedAccounts?.find((a) => a.id === editingAccount.id) ??
            accounts.find((a) => a.id === editingAccount.id) ??
            editingAccount
          }
          isOpen={true}
          onClose={() => setEditingAccount(null)}
          onDeleteRequest={() => {
            setConfirmDeleteId(editingAccount.id || null);
            setEditingAccount(null);
          }}
        />
      )}
    </PageSection>
  );
};

export default SavingsAccountsList;
