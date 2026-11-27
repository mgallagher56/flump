import { Linking } from "react-native";
import { Button } from "../../components/Button";
import { Disclosure } from "../../components/Disclosure";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { FigureList } from "../../components/FigureList";
import { HeroFigure } from "../../components/HeroFigure";
import { MonthLineChart } from "../../components/MonthLineChart";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import {
  ACCOUNTS,
  basisSentence,
  changeByAccountCaption,
  comparedMonthsText,
  fewMonthsPrompt,
  formatMonth,
  formatSignedChange,
  HISTORY,
  historyChartSummary,
  historySourceLabel,
  nextCheckInLine,
  notRecordedPrompt,
  pounds,
  recordedForSentence,
  sentences,
  spokenChange,
} from "../../copy/accounts";
import { CHECK_IN } from "../../copy/checkIn";
import { OPEN_FLUMP_WEBSITE } from "../../copy/navigation";
import { useDelayedLoading } from "../../data/useDelayedLoading";
import {
  type NetWorthHistory as History,
  MIN_CHART_MONTHS,
} from "../../features/accounts/accountsModel";
import {
  type NetWorthHistoryState,
  useNetWorthHistory,
} from "../../features/accounts/useAccountsData";
import type { WebLink } from "../../navigation/shell";
import { NotSetUp } from "../NotSetUp";
import { TermsRequired } from "../TermsRequired";

/** Under the stack header, which pads the top. */
const EDGES = ["right", "bottom", "left"] as const;

export interface NetWorthHistoryWebLinks {
  setUp: WebLink;
  addAccount: WebLink;
  /** Web's history page, where earlier months are added until S8. */
  addEarlierMonths: WebLink;
}

export interface NetWorthHistoryProps {
  onSignOut(): void;
  marketingOrigin: string;
  links: NetWorthHistoryWebLinks;
  onOpenCheckIn(): void;
  /** Injected clock for tests. */
  now?: () => Date;
}

const open = (link: WebLink) => () => void Linking.openURL(link.url);
const website = (link: WebLink, words: string) => (link.exact ? words : OPEN_FLUMP_WEBSITE);

/**
 * Net worth history (E12 S6, plan 9.9), as web's `SnapshotHistoryPage`: the change between the
 * last two recorded months, the chart from three recorded months with its summary, every month,
 * and each account's change behind one control. Read only: nothing here edits a month.
 */
export function NetWorthHistory({
  onSignOut,
  marketingOrigin,
  links,
  onOpenCheckIn,
  now = () => new Date(),
}: NetWorthHistoryProps) {
  const { state, refresh } = useNetWorthHistory(now);
  if (state.status === "error" && state.problem === "termsNotAccepted") {
    return (
      <TermsRequired
        marketingOrigin={marketingOrigin}
        onRetry={state.retry}
        onSignOut={onSignOut}
        edges={EDGES}
      />
    );
  }
  if (state.status === "notSetUp") return <NotSetUp setUp={links.setUp} edges={EDGES} />;
  return (
    <Screen edges={EDGES} testID="net-worth-history" onRefresh={refresh}>
      <Body state={state} links={links} onOpenCheckIn={onOpenCheckIn} />
    </Screen>
  );
}

function Body({
  state,
  links,
  onOpenCheckIn,
}: {
  state: Exclude<NetWorthHistoryState, { status: "notSetUp" }>;
} & Pick<NetWorthHistoryProps, "links" | "onOpenCheckIn">) {
  const skeleton = useDelayedLoading(state.status === "loading");
  if (state.status === "error") {
    return (
      <ErrorState
        heading={CHECK_IN.loadErrorHeading}
        body={
          state.problem === "outOfStep" ? CHECK_IN.loadErrorOutOfStepBody : CHECK_IN.loadErrorBody
        }
        retryLabel={CHECK_IN.tryAgain}
        testID="history-error"
        retryTestID="history-retry"
        onRetry={state.retry}
      />
    );
  }
  if (state.status === "loading" || skeleton) {
    return skeleton ? (
      <HeroFigure
        label={HISTORY.heroLabel}
        value={null}
        loading
        loadingLabel={HISTORY.loading}
        testID="history-loading"
      />
    ) : null;
  }
  const { history } = state;
  if (history.recordedMonths === 0) {
    return (
      <EmptyState
        title={HISTORY.emptyTitle}
        description={history.hasAccounts ? HISTORY.emptyWithAccounts : HISTORY.emptyNoAccounts}
        actions={
          history.hasAccounts
            ? [
                {
                  label: ACCOUNTS.startCheckIn,
                  onPress: onOpenCheckIn,
                  testID: "history-check-in",
                },
                {
                  label: website(links.addEarlierMonths, HISTORY.addEarlierMonths),
                  onPress: open(links.addEarlierMonths),
                  variant: "link",
                  testID: "history-add-earlier",
                },
              ]
            : [
                {
                  label: website(links.addAccount, ACCOUNTS.addAccount),
                  onPress: open(links.addAccount),
                  variant: "link",
                  testID: "history-add-account",
                },
              ]
        }
        testID="history-empty"
      />
    );
  }
  return <Loaded history={history} links={links} onOpenCheckIn={onOpenCheckIn} />;
}

function Loaded({
  history,
  links,
  onOpenCheckIn,
}: { history: History } & Pick<NetWorthHistoryProps, "links" | "onOpenCheckIn">) {
  const basisText = basisSentence(history.leftOut);
  const { comparison, latestRecorded, previousRecorded } = history;
  const enoughForChart = history.recordedMonths >= MIN_CHART_MONTHS;
  const summary = enoughForChart
    ? historyChartSummary(
        history.firstMonth,
        history.change,
        history.earlierCarried,
        history.endCarried,
      )
    : latestRecorded
      ? recordedForSentence(latestRecorded.month, latestRecorded.netWorth)
      : "";
  return (
    <>
      {comparison ? (
        <HeroFigure
          label={HISTORY.heroLabel}
          value={comparison.netWorthChange}
          signed
          caption={sentences(comparedMonthsText(comparison), basisText)}
          testID="history-hero"
        />
      ) : (
        <HeroFigure
          label={HISTORY.noChangeLabel}
          value={null}
          notSetLabel={HISTORY.noEarlierMonth}
          emptyPrompt={sentences(HISTORY.noChangePrompt, basisText)}
          testID="history-hero-empty"
        />
      )}
      {comparison && !history.checkedIn ? (
        <Button
          label={notRecordedPrompt(history.currentMonthName)}
          variant="link"
          accessibilityRole="link"
          testID="history-hero-check-in"
          onPress={onOpenCheckIn}
        />
      ) : null}
      <Text accessibilityRole="header" textStyle="heading.sm">
        {HISTORY.chartTitle}
      </Text>
      <Text textStyle="body.sm" color="secondary">
        {HISTORY.chartDescription}
      </Text>
      {enoughForChart ? <MonthLineChart points={history.chart} testID="history-chart" /> : null}
      {summary ? <Text testID="history-chart-summary">{summary}</Text> : null}
      {enoughForChart ? null : (
        <Text color="secondary" testID="history-few-months">
          {fewMonthsPrompt(history.recordedMonths)}
        </Text>
      )}
      <Button
        label={ACCOUNTS.startCheckIn}
        variant={enoughForChart ? "outline" : "primary"}
        testID="history-check-in"
        onPress={onOpenCheckIn}
      />
      <Button
        label={website(links.addEarlierMonths, HISTORY.addEarlierMonths)}
        variant="link"
        accessibilityRole="link"
        testID="history-add-earlier"
        onPress={open(links.addEarlierMonths)}
      />
      {history.nextCheckIn ? (
        <Text textStyle="body.sm" color="secondary" tabular testID="history-next-check-in">
          {nextCheckInLine(history.nextCheckIn)}
        </Text>
      ) : null}
      <FigureList
        rows={history.series.map((p) => ({
          id: p.month,
          label: formatMonth(p.month),
          figure: pounds(p.netWorth),
          note: p.allCarried ? HISTORY.carriedForward : HISTORY.recorded,
        }))}
        testID="history-months"
      />
      {latestRecorded && previousRecorded && history.accountChanges.length > 0 ? (
        <Disclosure
          label={HISTORY.showChanges}
          openLabel={HISTORY.hideChanges}
          testID="history-changes"
        >
          <FigureList
            caption={changeByAccountCaption(previousRecorded.month, latestRecorded.month)}
            rows={history.accountChanges.map((c) => ({
              id: c.accountId,
              label: `${c.name}${c.isLiability ? HISTORY.owed : ""}`,
              figure: formatSignedChange(c.effect),
              spoken: spokenChange(c.effect),
              note: c.carried ? HISTORY.carriedForward : historySourceLabel(c.currentSource),
            }))}
            testID="history-change-rows"
          />
        </Disclosure>
      ) : null}
    </>
  );
}
