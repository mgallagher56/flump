import { AccountGroup } from "../../components/AccountGroup";
import { AccountRow } from "../../components/AccountRow";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { HeroFigure } from "../../components/HeroFigure";
import { NetWorthBasisLine } from "../../components/NetWorthBasisLine";
import { Screen } from "../../components/Screen";
import { Toast } from "../../components/Toast";
import { ACCOUNTS, STUDENT_LOAN_FACTS, studentLoanFootnote, typeLine } from "../../copy/accounts";
import { CHECK_IN } from "../../copy/checkIn";
import { useDelayedLoading } from "../../data/useDelayedLoading";
import type { AccountRow as Row } from "../../features/accounts/accountsModel";
import { type AccountsListState, useAccountsList } from "../../features/accounts/useAccountsData";
import type { WebLink } from "../../navigation/shell";
import { NotSetUp } from "../NotSetUp";
import { TermsRequired } from "../TermsRequired";

/** The list sits under the tab header and above the tab bar, which pad the top and bottom. */
const TAB_EDGES = ["right", "left"] as const;

/** The website page the list links to: setting up, which the app does not have yet. */
export interface AccountsWebLinks {
  setUp: WebLink;
}

export interface AccountsProps {
  onSignOut(): void;
  marketingOrigin: string;
  links: AccountsWebLinks;
  onOpenAccount(id: string): void;
  /** Opens the add form (E12 S8). */
  onAddAccount(): void;
  /** Opens the add form as web's "Add an estimate" does: a home, your own estimate. */
  onAddEstimate(): void;
  /** A save that went through but left something out, said once at the top (web's toast). */
  notice?: string | null;
  onOpenHistory(): void;
  onOpenCheckIn(): void;
  /** Opens the app's net worth choices (Settings, Profile, E12 S9). */
  onChangeWhatCounts(): void;
  /** Injected clock for tests. */
  now?: () => Date;
}

/**
 * The Accounts tab (E12 S6, plan 9.9): the total of the accounts listed with what it leaves out,
 * the way to history and the check-in, then what you own, what you owe and what is not counted,
 * each row one account. Read only: adding an account is on the website until S8.
 */
export function Accounts({
  onSignOut,
  marketingOrigin,
  links,
  onOpenAccount,
  onAddAccount,
  onAddEstimate,
  notice = null,
  onOpenHistory,
  onOpenCheckIn,
  onChangeWhatCounts,
  now = () => new Date(),
}: AccountsProps) {
  const { state, refresh } = useAccountsList(now);
  if (state.status === "error" && state.problem === "termsNotAccepted") {
    return (
      <TermsRequired
        marketingOrigin={marketingOrigin}
        onRetry={state.retry}
        onSignOut={onSignOut}
        edges={TAB_EDGES}
      />
    );
  }
  if (state.status === "notSetUp") return <NotSetUp setUp={links.setUp} edges={TAB_EDGES} />;
  return (
    <Screen edges={TAB_EDGES} testID="accounts" onRefresh={refresh}>
      <Toast message={notice} testID="accounts-notice" />
      <Body
        state={state}
        onOpenAccount={onOpenAccount}
        onAddAccount={onAddAccount}
        onAddEstimate={onAddEstimate}
        onOpenHistory={onOpenHistory}
        onOpenCheckIn={onOpenCheckIn}
        onChangeWhatCounts={onChangeWhatCounts}
      />
    </Screen>
  );
}

function Body({
  state,
  onOpenAccount,
  onAddAccount,
  onAddEstimate,
  onOpenHistory,
  onOpenCheckIn,
  onChangeWhatCounts,
}: {
  state: Exclude<AccountsListState, { status: "notSetUp" }>;
} & Pick<
  AccountsProps,
  | "onOpenAccount"
  | "onAddAccount"
  | "onAddEstimate"
  | "onOpenHistory"
  | "onOpenCheckIn"
  | "onChangeWhatCounts"
>) {
  // Nothing for 200 ms, then blocks for at least 400 ms. A refetch keeps the list on screen.
  const skeleton = useDelayedLoading(state.status === "loading");
  if (state.status === "error") {
    // Never "No accounts yet", an empty list or £0; out of step never blames the connection.
    return (
      <ErrorState
        heading={CHECK_IN.loadErrorHeading}
        body={
          state.problem === "outOfStep" ? CHECK_IN.loadErrorOutOfStepBody : CHECK_IN.loadErrorBody
        }
        retryLabel={CHECK_IN.tryAgain}
        testID="accounts-error"
        retryTestID="accounts-retry"
        onRetry={state.retry}
      />
    );
  }
  if (state.status === "loading" || skeleton) {
    return skeleton ? (
      <HeroFigure
        label={ACCOUNTS.heroLabel}
        value={null}
        loading
        loadingLabel={ACCOUNTS.loading}
        testID="accounts-loading"
      />
    ) : null;
  }
  const { list } = state;
  if (!list) {
    return (
      <EmptyState
        title={ACCOUNTS.emptyTitle}
        description={ACCOUNTS.emptyDescription}
        actions={[
          {
            label: ACCOUNTS.addAccount,
            variant: "primary",
            onPress: onAddAccount,
            testID: "accounts-add-account",
          },
        ]}
        testID="accounts-empty"
      />
    );
  }
  const row = (r: Row) => (
    <AccountRow
      key={r.id}
      name={r.name}
      typeLine={typeLine(r)}
      balance={r.balance}
      testID={`account-row-${r.id}`}
      onPress={() => onOpenAccount(r.id)}
    />
  );
  return (
    <>
      <HeroFigure label={ACCOUNTS.heroLabel} value={list.netWorth} testID="accounts-hero" />
      <NetWorthBasisLine
        leftOut={list.leftOut}
        alwaysShowLink
        choicesAvailable={list.choicesAvailable}
        onChangeWhatCounts={onChangeWhatCounts}
        onAddEstimate={onAddEstimate}
        testID="accounts-basis-line"
      />
      <Button
        label={ACCOUNTS.seeHowItHasChanged}
        variant="link"
        accessibilityRole="link"
        testID="accounts-view-history"
        onPress={onOpenHistory}
      />
      <Button
        label={ACCOUNTS.startCheckIn}
        variant="outline"
        testID="accounts-open-check-in"
        onPress={onOpenCheckIn}
      />
      {list.own.length > 0 ? (
        <AccountGroup
          title={ACCOUNTS.ownTitle}
          description={ACCOUNTS.ownDescription}
          total={list.own.length > 1 ? { label: ACCOUNTS.ownTotal, value: list.totalOwn } : null}
          testID="accounts-own"
        >
          {list.own.map(row)}
        </AccountGroup>
      ) : null}
      {list.owe.length > 0 ? (
        <AccountGroup
          title={ACCOUNTS.oweTitle}
          description={ACCOUNTS.oweDescription}
          total={list.owe.length > 1 ? { label: ACCOUNTS.oweTotal, value: list.totalOwe } : null}
          footnote={list.countedStudentLoan ? studentLoanFootnote(true) : null}
          testID="accounts-owe"
        >
          {list.owe.map(row)}
        </AccountGroup>
      ) : null}
      {list.notCounted.length > 0 ? (
        <AccountGroup
          title={ACCOUNTS.notCountedTitle}
          description={ACCOUNTS.notCountedDescription}
          footnote={list.leftOutStudentLoan ? STUDENT_LOAN_FACTS : null}
          testID="accounts-not-counted"
        >
          {list.notCounted.map(row)}
        </AccountGroup>
      ) : null}
      <Button
        label={ACCOUNTS.addAccount}
        variant="outline"
        testID="accounts-add-account"
        onPress={onAddAccount}
      />
    </>
  );
}
