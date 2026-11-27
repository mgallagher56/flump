import {
  describeJointShareOfWhole,
  describeJointWholeHistory,
} from "@flump/finance-engine/accounts";
import type { ReactNode } from "react";
import { Linking } from "react-native";
import { Button } from "../../components/Button";
import { ChartFigure } from "../../components/ChartFigure";
import { CollapsibleDrawer } from "../../components/CollapsibleDrawer";
import { DataList } from "../../components/DataList";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { HeroFigure } from "../../components/HeroFigure";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import {
  ACCOUNT,
  accountChartSummary,
  accountMonthNote,
  balanceDateLine,
  heroSentences,
  pointMonth,
  pounds,
  SHOW_DATA,
} from "../../copy/accounts";
import { CHECK_IN } from "../../copy/checkIn";
import { OPEN_FLUMP_WEBSITE } from "../../copy/navigation";
import { useDelayedLoading } from "../../data/useDelayedLoading";
import type { AccountDetail as Detail } from "../../features/accounts/accountsModel";
import { type AccountDetailState, useAccountDetail } from "../../features/accounts/useAccountsData";
import type { WebLink } from "../../navigation/shell";
import { NotSetUp } from "../NotSetUp";
import { TermsRequired } from "../TermsRequired";

/** Under the stack header, which pads the top. */
const EDGES = ["right", "bottom", "left"] as const;

/** Fewest months worth a line on the account page (web's `MIN_ACCOUNT_POINTS`). */
const MIN_ACCOUNT_POINTS = 2;

export interface AccountDetailProps {
  id: string;
  onSignOut(): void;
  marketingOrigin: string;
  links: {
    setUp: WebLink;
    /** The account's own page on the website, where it is edited until S8. */
    edit: WebLink;
  };
  /** Back to the accounts list, from "We cannot find that account." */
  onBackToAccounts(): void;
  /** The header for the account's name (the route's `Stack.Screen`). */
  header?(title: string): ReactNode;
  /** Injected clock for tests. */
  now?: () => Date;
}

/**
 * One account's page (E12 S6, plan 9.9), as web's: the balance or amount owed with the line that
 * dates it, a joint account's whole beside the share, then its balance history with the chart, its
 * summary and every month. Read only: editing is on the website until S8.
 */
export function AccountDetail({
  id,
  onSignOut,
  marketingOrigin,
  links,
  onBackToAccounts,
  header = () => null,
  now = () => new Date(),
}: AccountDetailProps) {
  const { state, refresh } = useAccountDetail(id, now);
  const title =
    state.status === "ready" && state.detail ? state.detail.name : ACCOUNT.titleFallback;
  if (state.status === "error" && state.problem === "termsNotAccepted") {
    return (
      <>
        {header(ACCOUNT.titleFallback)}
        <TermsRequired
          marketingOrigin={marketingOrigin}
          onRetry={state.retry}
          onSignOut={onSignOut}
          edges={EDGES}
        />
      </>
    );
  }
  if (state.status === "notSetUp") {
    return (
      <>
        {header(ACCOUNT.titleFallback)}
        <NotSetUp setUp={links.setUp} edges={EDGES} />
      </>
    );
  }
  return (
    <>
      {header(title)}
      <Screen edges={EDGES} testID="account-detail" onRefresh={refresh}>
        <Body state={state} links={links} onBackToAccounts={onBackToAccounts} />
      </Screen>
    </>
  );
}

function Body({
  state,
  links,
  onBackToAccounts,
}: {
  state: Exclude<AccountDetailState, { status: "notSetUp" }>;
} & Pick<AccountDetailProps, "links" | "onBackToAccounts">) {
  const skeleton = useDelayedLoading(state.status === "loading");
  if (state.status === "error") {
    return (
      <ErrorState
        heading={CHECK_IN.loadErrorHeading}
        body={
          state.problem === "outOfStep" ? CHECK_IN.loadErrorOutOfStepBody : CHECK_IN.loadErrorBody
        }
        retryLabel={CHECK_IN.tryAgain}
        testID="account-detail-error"
        retryTestID="account-detail-retry"
        onRetry={state.retry}
      />
    );
  }
  if (state.status === "loading" || skeleton) {
    return skeleton ? (
      <HeroFigure
        label={ACCOUNT.balanceLabel}
        value={null}
        loading
        loadingLabel={ACCOUNT.loading}
        testID="account-detail-loading"
      />
    ) : null;
  }
  const { detail } = state;
  if (!detail) {
    return (
      <>
        <Text testID="account-not-found">{ACCOUNT.notFound}</Text>
        <Button
          label={ACCOUNT.backToAccounts}
          variant="secondary"
          testID="account-back-to-accounts"
          onPress={onBackToAccounts}
        />
      </>
    );
  }
  return <Loaded detail={detail} links={links} />;
}

function Loaded({ detail, links }: { detail: Detail; links: AccountDetailProps["links"] }) {
  const { account, hero, owed } = detail;
  const wholeOf = owed ? "amount owed" : "balance";
  const share = {
    name: account.name,
    type: account.type,
    accountSubtype: account.accountSubtype,
    ownership: account.ownership,
    sharePercent: account.sharePercent,
  };
  const subline = heroSentences(
    describeJointShareOfWhole(share, wholeOf, pounds(hero.whole)),
    balanceDateLine(detail.current, hero.month),
    detail.notCounted ? ACCOUNT.notCounted : null,
  );
  return (
    <>
      <HeroFigure
        label={owed ? ACCOUNT.owedLabel : ACCOUNT.balanceLabel}
        value={hero.balance}
        caption={subline}
        testID="account-detail-hero"
      />
      <Text accessibilityRole="header" textStyle="heading.sm">
        {ACCOUNT.historyTitle}
      </Text>
      {detail.hasMonths ? (
        <>
          <Text textStyle="body.sm" color="secondary" testID="account-history-description">
            {describeJointWholeHistory(share, wholeOf) ?? ACCOUNT.historyDescription}
          </Text>
          {detail.series.length >= MIN_ACCOUNT_POINTS ? (
            <>
              <ChartFigure points={detail.chart} testID="account-chart" />
              <Text testID="account-chart-summary">
                {accountChartSummary(detail.firstMonth, detail.change, detail.endCarried)}
              </Text>
            </>
          ) : (
            <Text color="secondary">{ACCOUNT.chartNotEnough}</Text>
          )}
          <CollapsibleDrawer
            label={SHOW_DATA.show}
            openLabel={SHOW_DATA.hide}
            testID="account-data"
          >
            <DataList
              rows={detail.series.map((p) => ({
                id: `${p.year}-${p.month}`,
                label: pointMonth(p),
                figure: pounds(p.value),
                note: accountMonthNote(p),
              }))}
              testID="account-months"
            />
          </CollapsibleDrawer>
        </>
      ) : (
        <EmptyState
          title={ACCOUNT.noHistoryTitle}
          description={ACCOUNT.noHistoryDescription}
          testID="account-no-history"
        />
      )}
      <Button
        label={links.edit.exact ? ACCOUNT.edit : OPEN_FLUMP_WEBSITE}
        variant="link"
        accessibilityRole="link"
        testID="account-edit-on-website"
        onPress={() => void Linking.openURL(links.edit.url)}
      />
    </>
  );
}
