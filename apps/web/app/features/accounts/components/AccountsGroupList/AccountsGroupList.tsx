import {
  Card,
  CollapsibleDrawer,
  Icon,
  Money,
  Num,
  StatusBadge,
  Table,
  TBody,
  Td,
  THead,
  Th,
  Tr,
  VisuallyHidden,
} from "@repo/ui";
import {
  CreditCard,
  HandCoins,
  Home,
  Landmark,
  LineChart,
  type LucideIcon,
  PiggyBank,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import type { FC } from "react";
import { Link } from "react-router";
import AddEditAccountsDialogBtn from "~/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog";
import { AccountTypeEnum, isLiabilityType } from "~/containers/accounts/utils";
import type { AccountRow } from "../../accountRows";
import {
  accountCell,
  accountIcon,
  accountLink,
  actionsCell,
  drawerWrap,
  group,
  groupHeader,
  groupMeta,
  groupTitle,
  listRoot,
  noChange,
} from "./AccountsGroupList.styles";

export interface AccountsGroupListProps {
  rows: AccountRow[];
  /** Group order. Types with no accounts are skipped. */
  order?: string[];
}

const {
  CURRENT,
  SAVING,
  INVESTMENT,
  PENSION,
  PROPERTY,
  CREDIT_CARD,
  MORTGAGE,
  LOAN,
  OVERDRAFT,
  STUDENT_LOAN,
  OWED,
} = AccountTypeEnum;

export const DEFAULT_GROUP_ORDER: string[] = [
  CURRENT,
  SAVING,
  INVESTMENT,
  PENSION,
  PROPERTY,
  CREDIT_CARD,
  MORTGAGE,
  LOAN,
  OVERDRAFT,
  STUDENT_LOAN,
  OWED,
];

const TYPE_ICON: Record<string, LucideIcon> = {
  [CURRENT]: Wallet,
  [SAVING]: PiggyBank,
  [INVESTMENT]: LineChart,
  [PENSION]: ShieldCheck,
  [CREDIT_CARD]: CreditCard,
  [PROPERTY]: Home,
  [MORTGAGE]: Home,
  [OVERDRAFT]: Landmark,
  [LOAN]: HandCoins,
  [STUDENT_LOAN]: HandCoins,
  [OWED]: Users,
};

/** Law 3: a table over eight rows keeps the rest behind a drawer. */
const VISIBLE_ROWS = 8;

const Change: FC<{ row: AccountRow }> = ({ row }) => {
  if (row.changePercent === null) return <span className={noChange()}>No earlier month</span>;
  if (row.changePercent === 0) return <StatusBadge size="sm">No change</StatusBadge>;
  const up = row.changePercent > 0;
  return (
    <StatusBadge size="sm" variant={row.favourable ? "positive" : "danger"}>
      {up ? "Up" : "Down"}{" "}
      <Num fractionDigits={0} kind="percent" size="sm" value={Math.abs(row.changePercent)} />
    </StatusBadge>
  );
};

const renderRows = (rows: AccountRow[], caption: string) => (
  <Table appearance="soft" caption={caption} stacked>
    <THead>
      <Tr>
        <Th>Account</Th>
        <Th numeric>Balance</Th>
        <Th>Change on last month</Th>
        <Th>
          <VisuallyHidden>Actions</VisuallyHidden>
        </Th>
      </Tr>
    </THead>
    <TBody>
      {rows.map((row) => (
        <Tr key={row.id}>
          <Td>
            <div className={accountCell()}>
              <span aria-hidden="true" className={accountIcon()}>
                <Icon icon={TYPE_ICON[row.type] ?? Wallet} size="md" />
              </span>
              <Link className={accountLink()} to={`/app/accounts/${row.id}`}>
                {row.name}
              </Link>
            </div>
          </Td>
          <Td label={isLiabilityType(row.type) ? "Owed" : "Balance"} numeric>
            {row.balance !== undefined ? (
              <Money fractionDigits={2} size="sm" value={row.balance} />
            ) : (
              <span className={noChange()}>Not set</span>
            )}
          </Td>
          <Td label="Change on last month">
            <Change row={row} />
          </Td>
          <Td label="Actions">
            <div className={actionsCell()}>
              <AddEditAccountsDialogBtn accountId={row.id} isEditAccount isIconButton />
            </div>
          </Td>
        </Tr>
      ))}
    </TBody>
  </Table>
);

/** Accounts grouped by type, one card per group, never a wall of cards. */
export const AccountsGroupList: FC<AccountsGroupListProps> = ({
  rows,
  order = DEFAULT_GROUP_ORDER,
}) => {
  const types = order.filter((type) => rows.some((row) => row.type === type));
  return (
    <div className={listRoot()}>
      {types.map((type) => {
        const groupRows = rows.filter((row) => row.type === type);
        const total = groupRows.reduce((sum, row) => sum + (row.balance ?? 0), 0);
        const visible = groupRows.slice(0, VISIBLE_ROWS);
        const rest = groupRows.slice(VISIBLE_ROWS);
        const headingId = `accounts-group-${type.replace(/\s+/g, "-").toLowerCase()}`;
        return (
          <section key={type} aria-labelledby={headingId} className={group()}>
            <div className={groupHeader()}>
              <h3 className={groupTitle()} id={headingId}>
                {type}
              </h3>
              <p className={groupMeta()}>
                {groupRows.length === 1 ? "1 account" : `${groupRows.length} accounts`},{" "}
                <Money size="sm" tone="muted" value={total} />
              </p>
            </div>
            <Card padding="none">
              {renderRows(visible, `${type} accounts`)}
              {rest.length > 0 && (
                <div className={drawerWrap()}>
                  <CollapsibleDrawer
                    closedLabel="Show all"
                    openLabel="Show fewer"
                    title={`${rest.length} more ${rest.length === 1 ? "account" : "accounts"}`}
                  >
                    {renderRows(rest, `More ${type} accounts`)}
                  </CollapsibleDrawer>
                </div>
              )}
            </Card>
          </section>
        );
      })}
    </div>
  );
};

export default AccountsGroupList;
