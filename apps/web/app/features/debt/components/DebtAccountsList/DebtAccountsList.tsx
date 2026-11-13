import type { DebtItem } from "@flump/finance-engine";
import {
  Button,
  CollapsibleDrawer,
  EmptyState,
  Icon,
  IconButton,
  Table,
  TBody,
  Td,
  THead,
  Th,
  Tr,
  VisuallyHidden,
} from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { type FC, useState } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { AddDebtDialog } from "../AddDebtDialog";
import {
  actionsCell,
  aprCell,
  aprNotSet,
  creditorName,
  deleteAction,
  drawerWrap,
  figure,
  listCard,
  listHeader,
  listHeading,
  listSubtitle,
  mutedFigure,
} from "./DebtAccountsList.styles";

export interface DebtAccountsListProps {
  debts: DebtItem[];
  onAddDebt: () => void;
  onDeleteDebt: (id: string) => void;
  onUpdateDebt: (id: string, updates: Partial<DebtItem>) => void;
  className?: string;
}

/** Law 3: a table over eight rows keeps the rest behind a drawer. */
const VISIBLE_ROWS = 8;

const TYPE_LABELS: Record<string, string> = {
  credit_card: "Credit card",
  loan: "Personal loan",
  overdraft: "Overdraft",
  bnpl: "Buy-now-pay-later",
  car_finance: "Car finance",
  other: "Other",
};

const typeLabel = (type: DebtItem["type"] | undefined): string =>
  (type && TYPE_LABELS[type]) || "Other";

const aprFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

export const DebtAccountsList: FC<DebtAccountsListProps> = ({
  debts,
  onAddDebt,
  onDeleteDebt,
  onUpdateDebt,
  className,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingDebt = debts.find((d) => d.id === editingId);

  const renderTable = (rows: DebtItem[], caption: string) => (
    <Table appearance="soft" caption={caption} stacked>
      <THead>
        <Tr>
          <Th>Creditor</Th>
          <Th>Type</Th>
          <Th numeric>Balance</Th>
          <Th numeric>APR</Th>
          <Th numeric>Minimum a month</Th>
          <Th numeric>
            <VisuallyHidden>Actions</VisuallyHidden>
          </Th>
        </Tr>
      </THead>
      <TBody>
        {rows.map((debt) => (
          <Tr key={debt.id}>
            <Th scope="row">
              <span className={creditorName}>{debt.name}</span>
            </Th>
            <Td label="Type">{typeLabel(debt.type)}</Td>
            <Td align="end" label="Balance">
              <span className={figure}>{formatCurrency(debt.balance)}</span>
            </Td>
            <Td align="end" label="APR">
              {debt.aprKnown === false ? (
                <span className={aprCell()}>
                  <span className={aprNotSet}>Not set</span>
                  <Button
                    aria-label={`Add APR for ${debt.name}`}
                    size="sm"
                    type="button"
                    variant="link"
                    onClick={() => setEditingId(debt.id)}
                  >
                    Add APR
                  </Button>
                </span>
              ) : (
                <span className={figure}>{aprFormat.format(debt.apr)}%</span>
              )}
            </Td>
            <Td align="end" label="Minimum a month">
              <span className={figure}>{formatCurrency(debt.minimumPayment)}</span>
              {debt.minimumPaymentEstimated ? <span className={mutedFigure}>estimated</span> : null}
            </Td>
            <Td align="end" label="Actions">
              <span className={actionsCell()}>
                <IconButton
                  label={`Edit ${debt.name}`}
                  size="sm"
                  type="button"
                  onClick={() => setEditingId(debt.id)}
                >
                  <Icon icon={Pencil} size="sm" />
                </IconButton>
                <IconButton
                  className={deleteAction}
                  label={`Delete ${debt.name}`}
                  size="sm"
                  type="button"
                  onClick={() => onDeleteDebt(debt.id)}
                >
                  <Icon icon={Trash2} size="sm" />
                </IconButton>
              </span>
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );

  const visible = debts.slice(0, VISIBLE_ROWS);
  const rest = debts.slice(VISIBLE_ROWS);

  return (
    <section aria-labelledby="debt-accounts-heading" className={cx(listCard(), className)}>
      <div className={listHeader()}>
        <div>
          <h2 className={listHeading} id="debt-accounts-heading">
            Active liability accounts
          </h2>
          <p className={listSubtitle}>
            Your credit cards, loans, overdrafts and store cards. Select edit to change a name, APR
            or minimum payment.
          </p>
        </div>
        <Button size="sm" type="button" onClick={onAddDebt}>
          <Icon icon={Plus} size="sm" />
          Add debt
        </Button>
      </div>

      {debts.length === 0 ? (
        <EmptyState
          description="Add a credit card, loan or overdraft to see it here."
          headingLevel="h3"
          icon={<Icon icon={CreditCard} />}
          size="sm"
          title="No active debts recorded."
          tone="muted"
        />
      ) : (
        <>
          {renderTable(visible, "Liability accounts")}
          {rest.length > 0 ? (
            <div className={drawerWrap}>
              <CollapsibleDrawer
                closedLabel="Show all debts"
                itemCount={rest.length}
                itemNoun={{ one: "more debt", other: "more debts" }}
                openLabel="Hide the rest"
                title="More debts"
              >
                {renderTable(rest, "More debts")}
              </CollapsibleDrawer>
            </div>
          ) : null}
        </>
      )}

      {editingDebt ? (
        <AddDebtDialog
          key={editingDebt.id}
          debt={editingDebt}
          isOpen
          onAddDebt={() => undefined}
          onClose={() => setEditingId(null)}
          onEditDebt={onUpdateDebt}
        />
      ) : null}
    </section>
  );
};

export default DebtAccountsList;
