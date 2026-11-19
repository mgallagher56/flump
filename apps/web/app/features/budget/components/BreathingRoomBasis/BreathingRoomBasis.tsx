import {
  budgetRowMonthly,
  DEBT_CATEGORY,
  PortfolioSnapshot,
  type RawAccount,
  type RawAccountDetail,
} from "@flump/finance-engine";
import { CollapsibleDrawer, IconTile, Money, Switch } from "@repo/ui";
import { Landmark, ListChecks } from "lucide-react";
import { type FC, useMemo, useState } from "react";
import { SampleAwareLink } from "~/components/navigation/SampleAwareLink";
import { type BudgetEntry, getCategoryLabel } from "~/types/budget";
import { isIncomeEntry } from "../../income";
import { breathingRoomBasis } from "./BreathingRoomBasis.styles";

export interface BreathingRoomBasisProps {
  /** The page's rows, linked ones included (they show as always counted). */
  entries: BudgetEntry[];
  accounts: readonly RawAccount[];
  accountDetails: readonly RawAccountDetail[];
  /**
   * Saves one entry's Essential flag: the one stored value the editor's Essential switch also
   * reads and writes (owner item 32b). Rejects on failure (the page shows the error).
   */
  onSetEssential: (id: string, isEssential: boolean) => Promise<void>;
}

/** Why a row is always counted, or null when its switch can change. */
const fixedReason = (entry: BudgetEntry): string | null => {
  if (entry.linked === "housing") return "From your housing details, always counted";
  if (entry.category === DEBT_CATEGORY) return "Debt payments are always counted";
  return null;
};

/**
 * "What Breathing room counts" (owner item 32b), beside the saved figure: the accounts it draws on
 * and the spending it covers, in two cards with their own headings and tiles. Each spending switch
 * is the entry's own Essential flag, so it is in step with the editor's switch both ways, and
 * changing it changes the saved figure. Accounts are listed as facts with a link to Savings,
 * where they are kept up to date. Collapsed by default, so the figure stays the first thing read.
 */
export const BreathingRoomBasis: FC<BreathingRoomBasisProps> = ({
  entries,
  accounts,
  accountDetails,
  onSetEssential,
}) => {
  const slots = breathingRoomBasis();
  const [pending, setPending] = useState<string | null>(null);
  const snapshot = useMemo(
    () => new PortfolioSnapshot([...accounts], [...accountDetails]),
    [accounts, accountDetails],
  );
  // The engine's own rule for money to draw on: current and savings accounts.
  const drawOn = useMemo(
    () =>
      accounts.filter((a) => {
        const category = a.id ? snapshot.getAccount(a.id)?.category : undefined;
        return category === "cash" || category === "savings";
      }),
    [accounts, snapshot],
  );
  const spending = entries.filter((e) => !isIncomeEntry(e) && budgetRowMonthly(e) > 0);
  const counted = spending.filter((e) => e.isEssential || fixedReason(e) !== null).length;

  const toggle = async (entry: BudgetEntry, next: boolean) => {
    setPending(entry.id);
    try {
      await onSetEssential(entry.id, next);
    } catch {
      // The page shows what went wrong; the switch keeps the saved value.
    } finally {
      setPending(null);
    }
  };

  return (
    <CollapsibleDrawer
      className={slots.root}
      closedLabel="Show what counts"
      openLabel="Hide what counts"
      subtitle={`${drawOn.length} ${drawOn.length === 1 ? "account" : "accounts"}, ${counted} of ${spending.length} spending entries`}
      title="What Breathing room counts"
    >
      <p className={slots.intro} data-testid="breathing-basis-intro" id="breathing-basis-intro">
        Breathing room is the money in these accounts over the spending switched on here. A switch
        sets whether that entry is essential in your budget.
      </p>
      <div className={slots.cards}>
        <section aria-labelledby="breathing-basis-accounts-heading" className={slots.card}>
          <div className={slots.cardHead}>
            <IconTile domain="savings" icon={Landmark} />
            <h3 className={slots.cardTitle} id="breathing-basis-accounts-heading">
              Accounts it draws on
            </h3>
          </div>
          {drawOn.length > 0 ? (
            <ul className={slots.list}>
              {drawOn.map((account) => (
                <li className={slots.item} key={account.id}>
                  <span>{account.name}</span>
                  <Money
                    size="sm"
                    value={Math.max(0, snapshot.getLatestBalance(account.id ?? ""))}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className={slots.empty}>No current or savings accounts yet.</p>
          )}
          <p className={slots.note}>Investments and pensions are not counted.</p>
          <SampleAwareLink
            className={slots.link}
            data-testid="breathing-basis-savings-link"
            id="breathing-basis-savings-link"
            sampleAriaLabel="Sign up to view or update your savings accounts"
            sampleLabel="View or update your savings accounts"
            to="/app/savings"
          >
            View or update your savings accounts
          </SampleAwareLink>
        </section>
        <section aria-labelledby="breathing-basis-spending-heading" className={slots.card}>
          <div className={slots.cardHead}>
            <IconTile domain="pay" icon={ListChecks} />
            <h3 className={slots.cardTitle} id="breathing-basis-spending-heading">
              Spending it covers
            </h3>
          </div>
          {spending.length > 0 ? (
            <ul className={slots.list}>
              {spending.map((entry) => {
                const reason = fixedReason(entry);
                return (
                  <li className={slots.switchItem} key={entry.id}>
                    <Switch
                      aria-describedby="breathing-basis-intro"
                      checked={reason !== null || entry.isEssential}
                      data-testid={`breathing-basis-essential-${entry.id}`}
                      disabled={reason !== null || pending === entry.id}
                      hint={
                        <span className={slots.hint}>
                          {getCategoryLabel(entry.category)},{" "}
                          <Money size="sm" tone="muted" value={budgetRowMonthly(entry)} /> a month
                          {reason ? `. ${reason}` : null}
                        </span>
                      }
                      id={`breathing-basis-essential-${entry.id.replace(/[^a-z0-9-]/gi, "-")}`}
                      label={entry.name}
                      onChange={(event) => void toggle(entry, event.target.checked)}
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={slots.empty}>No spending entries yet.</p>
          )}
        </section>
      </div>
    </CollapsibleDrawer>
  );
};

export default BreathingRoomBasis;
