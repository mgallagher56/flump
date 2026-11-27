import {
  accountBalanceShown,
  accountBalanceStored,
  describeJointWholeValue,
} from "@flump/finance-engine/account-form";
import {
  describeJointShareOfWhole,
  describeJointWholeHistory,
} from "@flump/finance-engine/accounts";
import type { ReactNode } from "react";
import { Linking } from "react-native";
import { Button } from "../../components/Button";
import { ChartFigure, SAID_BY_CHART } from "../../components/ChartFigure";
import { CollapsibleDrawer } from "../../components/CollapsibleDrawer";
import { DataList } from "../../components/DataList";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { HeroFigure } from "../../components/HeroFigure";
import { QuickBalanceUpdate } from "../../components/QuickBalanceUpdate";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { ACCOUNT_FORM, saveFailedMessage } from "../../copy/accountForms";
import {
  ACCOUNT,
  accountChartSummary,
  accountChartTitle,
  accountMonthNote,
  accountTypeSubtitle,
  balanceDateLine,
  heroSentences,
  ownerPageFor,
  pointMonth,
  pounds,
  SHOW_DATA,
} from "../../copy/accounts";
import { CHECK_IN } from "../../copy/checkIn";
import { OPEN_FLUMP_WEBSITE } from "../../copy/navigation";
import { useAccountWrites } from "../../data/accountWrites";
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
    /** Web's mortgage page, which owns a mortgage's detail (web's `ownerPageFor`). */
    mortgage: WebLink;
    /** Web's debts page, which owns a debt's or student loan's detail. */
    debts: WebLink;
  };
  /** Back to the accounts list, from "We cannot find that account." */
  onBackToAccounts(): void;
  /** Opens the edit form, where delete sits too (E12 S8). */
  onEdit(): void;
  /** The header for the account's name (the route's `Stack.Screen`). */
  header?(title: string): ReactNode;
  /** Injected clock for tests. */
  now?: () => Date;
}

/**
 * One account's page (E12 S6, plan 9.9), as web's: the balance or amount owed with the line that
 * dates it, a joint account's whole beside the share, then its balance history with the chart, its
 * summary and every month. "Edit" opens the edit form; the quick update saves a new balance here.
 */
export function AccountDetail({
  id,
  onSignOut,
  marketingOrigin,
  links,
  onBackToAccounts,
  onEdit,
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
        <Body state={state} links={links} onBackToAccounts={onBackToAccounts} onEdit={onEdit} />
      </Screen>
    </>
  );
}

function Body({
  state,
  links,
  onBackToAccounts,
  onEdit,
}: {
  state: Exclude<AccountDetailState, { status: "notSetUp" }>;
} & Pick<AccountDetailProps, "links" | "onBackToAccounts" | "onEdit">) {
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
  return <Loaded detail={detail} links={links} onEdit={onEdit} />;
}

function Loaded({
  detail,
  links,
  onEdit,
}: {
  detail: Detail;
  links: AccountDetailProps["links"];
  onEdit(): void;
}) {
  const { account, hero, owed } = detail;
  const writes = useAccountWrites();
  // The saved figure as the edit form's field shows it: a debt as the positive amount owed.
  const savedShown = accountBalanceShown(account.type, account.balance);
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
  const typeSubtitle = accountTypeSubtitle({ ...account, name: detail.name });
  const jointHistory = describeJointWholeHistory(share, wholeOf);
  const chartSummary = accountChartSummary(detail.firstMonth, detail.change, detail.endCarried);
  const lastPoint = detail.series.at(-1);
  const owner = ownerLink(account.type, links);
  return (
    <>
      {typeSubtitle ? (
        <Text color="secondary" testID="account-type">
          {typeSubtitle}
        </Text>
      ) : null}
      <HeroFigure
        label={owed ? ACCOUNT.owedLabel : ACCOUNT.balanceLabel}
        value={hero.balance}
        caption={subline}
        testID="account-detail-hero"
      />
      <QuickBalanceUpdate
        accountName={detail.name}
        owed={owed}
        current={savedShown === "" ? null : Number(savedShown)}
        hint={describeJointWholeValue(share, wholeOf)}
        onSave={async (shown) => {
          // Stored as minus the amount owed for a debt, as the edit form sends it.
          const balance = Number(accountBalanceStored(account.type, String(shown)));
          const result = await writes.update(account.id, { balance }, account.updatedAt);
          if (result.status === "saved") return null;
          if (result.status === "conflict") return ACCOUNT_FORM.conflict;
          return saveFailedMessage(result.status === "failed" ? result.kind : "client");
        }}
      />
      <Button label={ACCOUNT_FORM.edit} variant="outline" testID="account-edit" onPress={onEdit} />
      <Text accessibilityRole="header" textStyle="heading.sm">
        {ACCOUNT.historyTitle}
      </Text>
      {detail.hasMonths ? (
        <>
          <Text
            textStyle="body.sm"
            color="secondary"
            testID="account-history-description"
            // A joint account's sentence is in the chart's spoken name when the chart is drawn.
            {...(jointHistory && detail.series.length >= MIN_ACCOUNT_POINTS ? SAID_BY_CHART : {})}
          >
            {jointHistory ?? ACCOUNT.historyDescription}
          </Text>
          {detail.series.length >= MIN_ACCOUNT_POINTS ? (
            <>
              <ChartFigure
                points={detail.chart}
                title={accountChartTitle(detail.name)}
                // Web's figure description, with a joint account's "the whole" sentence first.
                summary={[jointHistory, chartSummary].filter(Boolean).join(" ")}
                endLabel={lastPoint ? pounds(lastPoint.value) : undefined}
                testID="account-chart"
              />
              {/* The chart's spoken name carries this summary: read it once. */}
              <Text testID="account-chart-summary" {...SAID_BY_CHART}>
                {chartSummary}
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
      {owner ? (
        <Button
          label={owner.link.exact ? owner.label : OPEN_FLUMP_WEBSITE}
          variant="link"
          accessibilityRole="link"
          testID="account-owner-page"
          onPress={() => void Linking.openURL(owner.link.url)}
        />
      ) : null}
      <Text textStyle="body.sm" color="secondary" testID="account-on-website">
        {ACCOUNT.onWebsite}
      </Text>
    </>
  );
}

/** Web's owner page link for this type, with the words and the website link for it. */
function ownerLink(type: string, links: AccountDetailProps["links"]) {
  const page = ownerPageFor(type);
  if (page === "mortgage") return { label: ACCOUNT.seeMortgage, link: links.mortgage };
  if (page === "debts") return { label: ACCOUNT.seeDebts, link: links.debts };
  return null;
}
