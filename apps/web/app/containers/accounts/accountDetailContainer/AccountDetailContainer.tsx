import {
  categorizeAccountType,
  countsTowardNetWorth,
  DEFAULT_NET_WORTH_BASIS,
  type NetWorthBasis,
} from "@flump/finance-engine";
import { Button, HeroFigure, Icon, PageBody, PageHeader } from "@repo/ui";
import { ArrowLeft } from "lucide-react";
import { type FC, useMemo } from "react";
import { Link, useLoaderData } from "react-router";
import AccountDetails from "~/components/accounts/AccountDetails";
import AddEditAccountsDialogBtn from "~/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog";
import { type AccountType, isLiabilityType } from "~/containers/accounts/utils";
import { summariseAccountBalance } from "~/features/accounts/accountRows";
import { TYPE_LABEL } from "~/features/accounts/components/AccountsGroupList";
import { londonMonth } from "~/features/snapshot/snapshotModel";
import type { loader } from "~/routes/app.accounts.$account";
import { versionField } from "~/services/conflict";
import { backLink, notFound, ownerLink } from "./AccountDetailContainer.styles";

const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });

/** "October", or "October 2025" when the month is not in `currentYear`. */
const monthWords = (month: number, year: number, currentYear: number): string => {
  const name = monthName.format(new Date(Date.UTC(year, month - 1, 1)));
  return year === currentYear ? name : `${name} ${year}`;
};

export interface BalanceDateInput {
  /** The current month and year on the Europe/London clock. */
  current: { month: number; year: number };
  /** The latest recorded month that is not in the future, or null with no history. */
  latest: { month: number; year: number; source?: string | null } | null;
}

/**
 * The line under the account hero that dates the figure (owner ruling 2026-11-15). The month is
 * named only when the figure is not from the current month ("As of October"); a calculated
 * balance says "Calculated for November"; a figure recorded this month shows the balance alone
 * (null). With no monthly balance at all the line says so.
 */
export const balanceDateLine = ({ current, latest }: BalanceDateInput): string | null => {
  if (!latest) return "No monthly balances recorded yet";
  const words = monthWords(latest.month, latest.year, current.year);
  if (latest.source === "calculated") return `Calculated for ${words}`;
  const isCurrent = latest.month === current.month && latest.year === current.year;
  return isCurrent ? null : `As of ${words}`;
};

/** "Not counted in your net worth.": said under the hero when the user's choices leave it out. */
export const NOT_COUNTED_TEXT = "Not counted in your net worth.";

/**
 * Whether the user's net worth choices count this account (a student loan is left out by default).
 * `undefined` applies the default choices; `null` means the choices could not be read, so the
 * answer is unknown and this returns null.
 */
export const accountCounts = (
  type: unknown,
  basis: NetWorthBasis | null | undefined,
): boolean | null => {
  if (basis === null) return null;
  return countsTowardNetWorth(
    categorizeAccountType(typeof type === "string" ? type : null),
    basis ?? DEFAULT_NET_WORTH_BASIS,
  );
};

/**
 * The type under the name, unless the name already says it: "Residential mortgage" hides
 * "Mortgage", "Student loan" hides "Student loan".
 */
export const typeSubtitle = (name: unknown, typeLabel: string): string | undefined =>
  String(name ?? "")
    .toLowerCase()
    .includes(typeLabel.trim().toLowerCase())
    ? undefined
    : typeLabel;

/** The page that owns this account's detail, with its quiet link text; null when none does. */
export const ownerPageFor = (type: unknown): { to: string; label: string } | null => {
  const category = categorizeAccountType(typeof type === "string" ? type : null);
  if (category === "mortgages") return { to: "/app/mortgage", label: "See your mortgage" };
  if (category === "debt" || category === "studentLoans") {
    return { to: "/app/debt", label: "See your debts" };
  }
  return null;
};

/** Joins the subline's sentences with a full stop between them; undefined when there are none. */
const sentences = (...parts: (string | null)[]): string | undefined => {
  const said = parts.filter((part): part is string => Boolean(part));
  if (said.length === 0) return undefined;
  if (said.length === 1) return said[0];
  return said.map((part) => (part.endsWith(".") ? part : `${part}.`)).join(" ");
};

const BackLink: FC = () => (
  <Link className={backLink()} to="/app/accounts">
    <Icon icon={ArrowLeft} size="sm" />
    Back to accounts
  </Link>
);

const AccountDetailContainer: FC = () => {
  const { account, accountDetails = [], basis } = useLoaderData<typeof loader>();

  // The hero shows the saved balance, the same figure as the accounts list and net worth (D22).
  const summary = useMemo(
    // The loader returns this account's recorded months only.
    () =>
      summariseAccountBalance(account ?? {}, (accountDetails ?? []) as never[], new Date(), true),
    [account, accountDetails],
  );
  const current = summary.balance ?? 0;
  // The current month on the Europe/London clock, as the backend keys it (not the device's).
  const [cy = 0, cm = 0] = londonMonth().split("-").map(Number);
  // The latest recorded month up to now: the month the hero's figure is from.
  const latest =
    (accountDetails as { month?: number; year?: number; source?: string | null }[])
      .map((d) => ({ month: Number(d.month), year: Number(d.year), source: d.source }))
      .filter(
        (d) => d.month >= 1 && d.year > 0 && (d.year < cy || (d.year === cy && d.month <= cm)),
      )
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .pop() ?? null;
  const dateLine = balanceDateLine({ current: { month: cm, year: cy }, latest });

  if (!account) {
    return (
      <PageBody>
        <BackLink />
        <p className={notFound()}>We cannot find that account.</p>
      </PageBody>
    );
  }

  const isLiability = isLiabilityType(account.type);
  const typeLabel = TYPE_LABEL[String(account.type ?? "")] ?? account.type ?? "Account";
  const owner = ownerPageFor(account.type);
  // Said quietly in the hero's subline, so no extra line sits between the hero and the chart.
  // Left out when the net worth choices could not be read (basis null): unknown is not "no".
  const notCounted = accountCounts(account.type, basis) === false ? NOT_COUNTED_TEXT : null;

  return (
    <PageBody>
      <BackLink />

      {/* One action, Edit, which holds the account's saved name, type and balance (R2-5). */}
      <PageHeader
        actions={
          <AddEditAccountsDialogBtn
            account={{
              id: String(account.id ?? ""),
              name: account.name ?? "",
              type: account.type as AccountType | undefined,
              balance:
                account.balance === undefined || account.balance === null
                  ? undefined
                  : Number(account.balance),
              studentLoanPlan: account.studentLoanPlan ?? null,
              ...versionField(account, "updatedAt"),
            }}
            accountId={String(account.id ?? "")}
            isEditAccount
          />
        }
        // The type, unless the name already says it ("Residential mortgage").
        description={typeSubtitle(account.name, typeLabel)}
        title={account.name ?? "Account"}
      />

      <HeroFigure
        label={isLiability ? "Amount owed" : "Current balance"}
        subline={sentences(dateLine, notCounted)}
        value={current}
      />

      <AccountDetails />

      {owner ? (
        <Button asChild className={ownerLink()} size="sm" variant="link">
          <Link data-testid="account-owner-link" id="account-owner-link" to={owner.to}>
            {owner.label}
          </Link>
        </Button>
      ) : null}
    </PageBody>
  );
};

export default AccountDetailContainer;
