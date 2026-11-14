import { categorizeAccountType, type NetWorthLeftOut } from "@flump/finance-engine";
import { Card, DataList, type DataListItem, IconTile, type IconTileDomain, Money } from "@repo/ui";
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
import type { FC, ReactNode } from "react";
import { Link } from "react-router";
import { AccountTypeEnum, isLiabilityType } from "~/containers/accounts/utils";
import type { AccountRow } from "../../accountRows";
import { NetWorthBasisLine } from "../NetWorthBasisLine";
import {
  accountCell,
  accountLink,
  accountName,
  accountType,
  group,
  groupTitle,
  historyLink,
  isaLink,
  listInCard,
  listRoot,
  netWorthBlock,
  netWorthLinks,
  note,
  totalLabel,
  totalRow,
} from "./AccountsGroupList.styles";

/** The net worth history page, linked from the net worth figure. */
export const HISTORY_HREF = "/app/accounts/history";

export interface AccountsGroupListProps {
  rows: AccountRow[];
  /** Everything owned that counts in net worth, from the financial picture. */
  totalOwn: number;
  /** Everything owed that counts in net worth under the user's choices. */
  totalOwe: number;
  netWorth: number;
  /** What net worth leaves out under the user's choices (`NetWorthTotals.leftOut`). */
  leftOut: readonly NetWorthLeftOut[];
  /** Rendered under the net worth figure, for example the phone's check-in button. */
  afterNetWorth?: ReactNode;
}

const STUDENT_LOAN_FACTS =
  "Repayments come out of your pay as you earn, and any balance left at the end of the repayment term is written off.";

/** The student loan footnote follows the user's choice; the facts about repayment stay. */
export const studentLoanFootnote = (counted: boolean): string =>
  counted
    ? `Student loans are in this total and your net worth. ${STUDENT_LOAN_FACTS}`
    : `Student loans are not in your net worth. ${STUDENT_LOAN_FACTS}`;

/**
 * True when the user's net worth choices leave this row out, so it sits in its own group below
 * the totals and the rows in each total add up to it.
 */
export const isLeftOut = (row: AccountRow, leftOut: readonly NetWorthLeftOut[]): boolean => {
  const category = categorizeAccountType(row.type);
  if (category === "property") return leftOut.includes("property");
  if (category === "mortgages") return leftOut.includes("mortgage");
  if (category === "studentLoans") return leftOut.includes("studentLoan");
  return false;
};

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

/** Law 3: a list over eight rows keeps the rest behind "Show all". */
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

/** The type under the name, unless the name already says it ("Current account"). */
const typeLine = (row: AccountRow): string | null => {
  const label = TYPE_LABEL[row.type] ?? row.type;
  return label.trim().toLowerCase() === row.name.trim().toLowerCase() ? null : label;
};

const toItem = (row: AccountRow): DataListItem => {
  const type = typeLine(row);
  return {
    id: row.id,
    label: (
      <span className={accountCell()}>
        <IconTile
          domain={TYPE_DOMAIN[row.type] ?? "net-worth"}
          icon={TYPE_ICON[row.type] ?? Wallet}
        />
        <span className={accountName()}>
          <Link className={accountLink()} to={`/app/accounts/${row.id}`}>
            {row.name}
          </Link>
          {type ? <span className={accountType()}>{type}</span> : null}
          {isIsa(row) ? (
            <Link className={isaLink()} to="/app/savings">
              See your ISA allowance
            </Link>
          ) : null}
        </span>
      </span>
    ),
    value: row.balance ?? null,
    valueProps: { size: "sm" },
  };
};

interface GroupProps {
  id: string;
  title: string;
  rows: AccountRow[];
  total?: { text: string; value: number };
  footnote?: string;
}

const Group: FC<GroupProps> = ({ id, title, rows, total, footnote }) => (
  <section aria-labelledby={id} className={group()}>
    <h2 className={groupTitle()} id={id}>
      {title}
    </h2>
    <Card padding="none">
      <DataList
        className={listInCard()}
        items={rows.map(toItem)}
        label={title}
        limit={VISIBLE_ROWS}
        noun={{ one: "account", other: "accounts" }}
      />
      {total ? (
        <dl className={totalRow()}>
          <dt className={totalLabel()}>{total.text}</dt>
          <dd>
            <Money size="sm" value={total.value} />
          </dd>
        </dl>
      ) : null}
    </Card>
    {footnote ? <p className={note()}>{footnote}</p> : null}
  </section>
);

/**
 * The accounts list (E16 PR 5, R2-5): what you own and what you owe, each a list with its total,
 * then net worth once. Accounts the user's net worth choices leave out sit in their own group
 * below, so the rows in each total add up to it. Change on last month lives on each account's page.
 */
export const AccountsGroupList: FC<AccountsGroupListProps> = ({
  rows,
  totalOwn,
  totalOwe,
  netWorth,
  leftOut,
  afterNetWorth,
}) => {
  const counted = rows.filter((row) => !isLeftOut(row, leftOut));
  // The engine counts an overdrawn account (a current account below zero) as money owed, not as
  // a negative asset, so it sits under "What you owe" as the amount owed and each total adds up.
  const overdrawn = (row: AccountRow) =>
    !isLiabilityType(row.type) && row.balance !== undefined && row.balance < 0;
  const own = counted.filter((row) => !isLiabilityType(row.type) && !overdrawn(row)).sort(byType);
  const owe = counted
    .filter((row) => isLiabilityType(row.type) || overdrawn(row))
    .map((row) => (overdrawn(row) ? { ...row, balance: Math.abs(row.balance ?? 0) } : row))
    .sort(byType);
  const notCounted = rows.filter((row) => isLeftOut(row, leftOut)).sort(byType);
  const countedStudentLoan = owe.some((row) => row.type === STUDENT_LOAN);
  const leftOutStudentLoan = notCounted.some((row) => row.type === STUDENT_LOAN);

  return (
    <div className={listRoot()}>
      {own.length > 0 ? (
        <Group
          id="accounts-own-heading"
          rows={own}
          title="What you own"
          total={{ text: "Total you own", value: totalOwn }}
        />
      ) : null}
      {owe.length > 0 ? (
        <Group
          footnote={countedStudentLoan ? studentLoanFootnote(true) : undefined}
          id="accounts-owe-heading"
          rows={owe}
          title="What you owe"
          total={{ text: "Total you owe", value: totalOwe }}
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
        <div className={netWorthLinks()}>
          {/* The one place the choice is always reachable from the figure, even with nothing left out. */}
          <NetWorthBasisLine alwaysShowLink id="accounts-net-worth-basis" leftOut={leftOut} />
          <Link
            className={historyLink()}
            data-testid="accounts-view-history"
            id="accounts-view-history"
            to={HISTORY_HREF}
          >
            See how it has changed
          </Link>
        </div>
        {afterNetWorth}
      </div>
      {notCounted.length > 0 ? (
        <Group
          footnote={leftOutStudentLoan ? studentLoanFootnote(false) : undefined}
          id="accounts-not-counted-heading"
          rows={notCounted}
          title="Not counted in net worth"
        />
      ) : null}
    </div>
  );
};

export default AccountsGroupList;
