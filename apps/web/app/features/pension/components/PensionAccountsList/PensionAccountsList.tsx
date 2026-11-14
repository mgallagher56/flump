import { Button, CollapsibleDrawer, Icon, Money, VisuallyHidden } from "@repo/ui";
import { Pencil } from "lucide-react";
import { type FC, useState } from "react";
import { useFetcher, useNavigate } from "react-router";
import type { Account } from "~/containers/accounts/types";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import { AddPensionAccountDialog } from "../AddPensionAccountDialog";
import {
  drawerWrap,
  listRoot,
  potActions,
  potBalance,
  potIdentity,
  potLink,
  potList,
  potMeta,
  potRow,
} from "./PensionAccountsList.styles";

export interface PensionAccountsListProps {
  accounts: Account[];
}

/** Law 3: a list over eight rows keeps the rest behind a drawer. */
const VISIBLE_ROWS = 8;

/**
 * "Your pots": one figure per row (the balance, E16 P1.4) and one "Edit" button. The growth rate,
 * extra monthly payment and "Delete pot" live in each pot's edit dialog, and its history on the
 * account page. Renders nothing when there
 * are no pots: the page's hero carries the one "Add pension pot" prompt.
 */
export const PensionAccountsList: FC<PensionAccountsListProps> = ({ accounts }) => {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const deleteOutcome = useFetcherOutcome(fetcher, { onSuccess: () => setAccountToDelete(null) });

  if (accounts.length === 0) return null;

  const confirmDelete = () => {
    if (!accountToDelete?.id) return;
    deleteOutcome.begin();
    fetcher.submit(
      { intent: "deletePensionAccount", accountId: accountToDelete.id },
      { method: "POST", action: "/app/pension" },
    );
  };

  const renderRows = (rows: Account[]) => (
    <ul className={potList()}>
      {rows.map((acc) => (
        <li className={potRow()} data-list-row="" key={acc.id ?? acc.name}>
          <span className={potIdentity()}>
            {acc.id ? (
              <button
                className={potLink()}
                type="button"
                onClick={() => navigate(`/app/accounts/${acc.id}`)}
              >
                {acc.name}
              </button>
            ) : (
              <span>{acc.name}</span>
            )}
            <span className={potMeta()}>
              {acc.isCurrent === false ? "Past pot" : "Current pot"}
            </span>
          </span>
          <span className={potBalance()}>
            <Money fractionDigits={0} size="sm" value={Number(acc.balance) || 0} />
          </span>
          {/* One edit affordance per row: delete lives inside the pot's edit dialog. */}
          <span className={potActions()}>
            <Button
              aria-label={`Edit ${acc.name}`}
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => setEditingAccount(acc)}
            >
              <Icon icon={Pencil} size="sm" />
              Edit
            </Button>
          </span>
        </li>
      ))}
    </ul>
  );

  const rest = accounts.slice(VISIBLE_ROWS);

  return (
    <section
      aria-labelledby="pension-pots-heading"
      className={listRoot()}
      data-testid="pension-pots"
      id="pension-pots"
    >
      {/* Named for assistive tech; the card heading already says what this is. */}
      <VisuallyHidden>
        <h2 id="pension-pots-heading">Your pots</h2>
      </VisuallyHidden>
      {renderRows(accounts.slice(0, VISIBLE_ROWS))}
      {rest.length > 0 && (
        <div className={drawerWrap()}>
          <CollapsibleDrawer
            itemCount={rest.length}
            itemNoun={{ one: "more pot", other: "more pots" }}
            title="Show all pots"
            variant="quiet"
          >
            {renderRows(rest)}
          </CollapsibleDrawer>
        </div>
      )}

      {editingAccount && (
        <AddPensionAccountDialog
          accountToEdit={editingAccount}
          isOpen={true}
          onClose={() => setEditingAccount(null)}
          onDeleteRequest={() => {
            setAccountToDelete(editingAccount);
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
        description="Its balance history will be deleted too. This cannot be undone."
        confirmLabel="Delete pot"
        tone="danger"
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default PensionAccountsList;
