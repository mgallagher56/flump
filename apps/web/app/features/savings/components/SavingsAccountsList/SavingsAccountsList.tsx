import {
  Button,
  Card,
  CollapsibleDrawer,
  Icon,
  Money,
  Table,
  TBody,
  Td,
  THead,
  Th,
  VisuallyHidden,
} from "@repo/ui";
import { Pencil, Trash2 } from "lucide-react";
import { type FC, useState } from "react";
import { Link, useFetcher } from "react-router";
import type { Account } from "~/containers/accounts/types";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import { AddSavingsAccountDialog } from "../AddSavingsAccountDialog";
import {
  accountLink,
  accountMeta,
  accountName,
  accountType,
  actionsCell,
  drawerWrap,
  listHeader,
  listRoot,
  listTitle,
  nameCell,
  tightCell,
} from "./SavingsAccountsList.styles";

export interface SavingsAccountsListProps {
  accounts: Account[];
}

/** Law 3: a table over eight rows keeps the rest behind a drawer. */
const VISIBLE_ROWS = 8;

const typeLabel = (acc: Account) => (acc.type === "Investment" ? "Investment" : "Savings");

/**
 * "Your accounts": one figure per row, the balance (plan P1.4). The rate and the amount saved each
 * month live in the account's detail page and its edit form.
 */
export const SavingsAccountsList: FC<SavingsAccountsListProps> = ({ accounts }) => {
  const fetcher = useFetcher();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const deleteOutcome = useFetcherOutcome(fetcher, { onSuccess: () => setConfirmDeleteId(null) });

  const accountToDelete = confirmDeleteId
    ? accounts.find((acc) => acc.id === confirmDeleteId)
    : undefined;

  const renderRows = (rows: Account[]) => (
    <Table caption="Savings and investment accounts">
      <THead>
        <tr>
          <Th>Account</Th>
          <Th className={tightCell()} numeric>
            Balance
          </Th>
          <Th className={tightCell()}>
            <VisuallyHidden>Actions</VisuallyHidden>
          </Th>
        </tr>
      </THead>
      <TBody>
        {rows.map((acc) => (
          <tr data-list-row="" key={acc.id}>
            <Td className={nameCell()}>
              <span className={accountMeta()}>
                <Link className={accountLink()} to={`/app/accounts/${acc.id}`}>
                  <span className={accountName()}>{acc.name}</span>
                </Link>
                <span className={accountType()}>{typeLabel(acc)}</span>
              </span>
            </Td>
            <Td className={tightCell()} numeric>
              <Money size="sm" value={Math.round(Number(acc.balance) || 0)} />
            </Td>
            <Td className={tightCell()}>
              <div className={actionsCell()}>
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
                  onClick={() => setConfirmDeleteId(acc.id || null)}
                >
                  <Icon icon={Trash2} size="sm" />
                </Button>
              </div>
            </Td>
          </tr>
        ))}
      </TBody>
    </Table>
  );

  const visible = accounts.slice(0, VISIBLE_ROWS);
  const rest = accounts.slice(VISIBLE_ROWS);

  return (
    <section
      aria-labelledby="savings-accounts-heading"
      className={listRoot()}
      data-testid="savings-accounts"
      id="savings-accounts"
    >
      <div className={listHeader()}>
        <h2 className={listTitle()} id="savings-accounts-heading">
          Your accounts
        </h2>
      </div>

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
          accountToEdit={editingAccount}
          isOpen={true}
          onClose={() => setEditingAccount(null)}
        />
      )}
    </section>
  );
};

export default SavingsAccountsList;
