import type { NetWorthLeftOut } from "@flump/finance-engine";
import {
  Card,
  CollapsibleDrawer,
  IconTile,
  type IconTileDomain,
  Money,
  Table,
  TBody,
  Td,
  THead,
  Th,
  Tr,
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
import { AccountTypeEnum, isLiabilityType } from "~/containers/accounts/utils";
import type { AccountRow } from "../../accountRows";
import { NetWorthBasisLine } from "../NetWorthBasisLine";
import {
  accountCell,
  accountLink,
  accountName,
  group,
  groupHeader,
  groupTitle,
  isaLink,
  listRoot,
  mutedText,
  netWorthBlock,
  note,
  phoneType,
  totalLabel,
  totalRow,
  typeCell,
  typeColumn,
} from "./AccountsGroupList.styles";

export interface AccountsGroupListProps {
  rows: AccountRow[];
  /** Everything owned, from the financial picture (the home estimate included). */
  totalOwn: number;
  /** Everything owed that counts in net worth under the user's choices. */
  totalOwe: number;
  netWorth: number;
  /** What net worth leaves out under the user's choices (`NetWorthTotals.leftOut`). */
  leftOut: readonly NetWorthLeftOut[];
}

/** The student loan footnote follows the user's choice; the facts about repayment stay. */
export const studentLoanFootnote = (counted: boolean): string =>
  `${
    counted
      ? "Student loans are in this total and your net worth."
      : "Student loans are not in this total or your net worth."
  } Repayments come out of your pay as you earn, and any balance left at the end of the repayment term is written off.`;

const {
  CURRENT,
  SAVING,
  INVESTMENT,
  PENSION,
  PROPERTY,
  OWED,
  CREDIT_CARD,
  MORTGAGE,
  LOAN,
  OVERDRAFT,
  STUDENT_LOAN,
} = AccountTypeEnum;

/** Row order inside each group: by type, then as saved. Unknown types sort last. */
export const TYPE_ORDER: string[] = [
  CURRENT,
  SAVING,
  INVESTMENT,
  PENSION,
  PROPERTY,
  OWED,
  MORTGAGE,
  CREDIT_CARD,
  LOAN,
  OVERDRAFT,
  STUDENT_LOAN,
];

/** Plain names for the stored types (copy guide 6.1: sentence case, no jargon). */
export const TYPE_LABEL: Record<string, string> = {
  [CURRENT]: "Current account",
  [SAVING]: "Savings",
  [INVESTMENT]: "Investments",
  [PENSION]: "Pension",
  [PROPERTY]: "Property",
  [OWED]: "Owed to you",
  [MORTGAGE]: "Mortgage",
  [CREDIT_CARD]: "Credit card",
  [LOAN]: "Loan",
  [OVERDRAFT]: "Overdraft",
  [STUDENT_LOAN]: "Student loan",
};

const TYPE_ICON: Record<string, LucideIcon> = {
  [CURRENT]: Wallet,
  [SAVING]: PiggyBank,
  [INVESTMENT]: LineChart,
  [PENSION]: ShieldCheck,
  [PROPERTY]: Home,
  [OWED]: Users,
  [MORTGAGE]: Home,
  [CREDIT_CARD]: CreditCard,
  [LOAN]: HandCoins,
  [OVERDRAFT]: Landmark,
  [STUDENT_LOAN]: HandCoins,
};

const TYPE_DOMAIN: Record<string, IconTileDomain> = {
  [CURRENT]: "savings",
  [SAVING]: "savings",
  [INVESTMENT]: "savings",
  [PENSION]: "pension",
  [PROPERTY]: "mortgage",
  [OWED]: "savings",
  [MORTGAGE]: "mortgage",
  [CREDIT_CARD]: "debt",
  [LOAN]: "debt",
  [OVERDRAFT]: "debt",
  [STUDENT_LOAN]: "debt",
};

/** Law 3: a table over eight rows keeps the rest behind a drawer. */
export const VISIBLE_ROWS = 8;

/** An ISA is named as one by the user; its allowance lives on the savings page. */
const isIsa = (row: AccountRow) => /\bisas?\b/i.test(row.name);

const byType = (a: AccountRow, b: AccountRow) => {
  const rank = (row: AccountRow) => {
    const index = TYPE_ORDER.indexOf(row.type);
    return index === -1 ? TYPE_ORDER.length : index;
  };
  return rank(a) - rank(b);
};

const renderTable = (rows: AccountRow[], caption: string, amountLabel: string) => (
  <Table appearance="soft" caption={caption} stacked>
    <THead>
      <Tr>
        <Th>Account</Th>
        <Th>Type</Th>
        <Th numeric>{amountLabel}</Th>
      </Tr>
    </THead>
    <TBody>
      {rows.map((row) => (
        <Tr data-list-row="" key={row.id}>
          <Td>
            <div className={accountCell()}>
              <IconTile
                domain={TYPE_DOMAIN[row.type] ?? "net-worth"}
                icon={TYPE_ICON[row.type] ?? Wallet}
              />
              <span className={accountName()}>
                <Link className={accountLink()} to={`/app/accounts/${row.id}`}>
                  {row.name}
                </Link>
                <span className={phoneType()}>{TYPE_LABEL[row.type] ?? row.type}</span>
                {isIsa(row) ? (
                  <Link className={isaLink()} to="/app/savings">
                    See your ISA allowance
                  </Link>
                ) : null}
              </span>
            </div>
          </Td>
          <Td className={typeColumn()} label="Type">
            <span className={typeCell()}>{TYPE_LABEL[row.type] ?? row.type}</span>
          </Td>
          <Td label={amountLabel} numeric>
            {row.balance !== undefined ? (
              <Money size="sm" value={row.balance} />
            ) : (
              <span className={mutedText()}>Not set</span>
            )}
          </Td>
        </Tr>
      ))}
    </TBody>
  </Table>
);

interface GroupProps {
  id: string;
  title: string;
  amountLabel: string;
  totalText: string;
  total: number;
  rows: AccountRow[];
  footnote?: string;
}

const Group: FC<GroupProps> = ({ id, title, amountLabel, totalText, total, rows, footnote }) => {
  const visible = rows.slice(0, VISIBLE_ROWS);
  const rest = rows.slice(VISIBLE_ROWS);
  return (
    <section aria-labelledby={id} className={group()}>
      <div className={groupHeader()}>
        <h2 className={groupTitle()} id={id}>
          {title}
        </h2>
      </div>
      <Card padding="none">
        {renderTable(visible, title, amountLabel)}
        {rest.length > 0 ? (
          <CollapsibleDrawer
            title={`Show ${rest.length} more ${rest.length === 1 ? "account" : "accounts"}`}
            variant="quiet"
          >
            {renderTable(rest, `${title}, more accounts`, amountLabel)}
          </CollapsibleDrawer>
        ) : null}
        <dl className={totalRow()}>
          <dt className={totalLabel()}>{totalText}</dt>
          <dd>
            <Money size="sm" value={total} />
          </dd>
        </dl>
      </Card>
      {footnote ? <p className={note()}>{footnote}</p> : null}
    </section>
  );
};

/**
 * The accounts list (E16 PR 5): what you own, then what you owe, each one table with a type column
 * and its total, then net worth once. Change on last month lives on each account's own page.
 */
export const AccountsGroupList: FC<AccountsGroupListProps> = ({
  rows,
  totalOwn,
  totalOwe,
  netWorth,
  leftOut,
}) => {
  const own = rows.filter((row) => !isLiabilityType(row.type)).sort(byType);
  const owe = rows.filter((row) => isLiabilityType(row.type)).sort(byType);
  const hasStudentLoan = owe.some((row) => row.type === STUDENT_LOAN);

  return (
    <div className={listRoot()}>
      {own.length > 0 ? (
        <Group
          amountLabel="Balance"
          id="accounts-own-heading"
          rows={own}
          title="What you own"
          total={totalOwn}
          totalText="Total you own"
        />
      ) : null}
      {owe.length > 0 ? (
        <Group
          amountLabel="Amount owed"
          footnote={
            hasStudentLoan ? studentLoanFootnote(!leftOut.includes("studentLoan")) : undefined
          }
          id="accounts-owe-heading"
          rows={owe}
          title="What you owe"
          total={totalOwe}
          totalText="Total you owe"
        />
      ) : null}
      <div className={netWorthBlock()}>
        <Card padding="none">
          <dl
            className={totalRow({ emphasis: true })}
            data-testid="accounts-net-worth"
            id="accounts-net-worth"
          >
            <dt className={totalLabel({ emphasis: true })}>Net worth</dt>
            <dd>
              <Money size="md" value={netWorth} />
            </dd>
          </dl>
        </Card>
        {/* The one place the choice is always reachable from the figure, even with nothing left out. */}
        <NetWorthBasisLine alwaysShowLink id="accounts-net-worth-basis" leftOut={leftOut} />
      </div>
    </div>
  );
};

export default AccountsGroupList;
