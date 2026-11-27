import { Linking } from "react-native";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { ErrorState } from "../../components/ErrorState";
import { HeroFigure } from "../../components/HeroFigure";
import { KpiStrip } from "../../components/KpiStrip";
import { NetWorthBasisLine } from "../../components/NetWorthBasisLine";
import { NetWorthTrendBars, TREND_PLOT_HEIGHT } from "../../components/NetWorthTrendBars";
import { Pressable } from "../../components/Pressable";
import { Screen } from "../../components/Screen";
import { TaxRatesStatusBanner } from "../../components/TaxRatesStatusBanner";
import { Text } from "../../components/Text";
import { ACCOUNTS } from "../../copy/accounts";
import { CHECK_IN } from "../../copy/checkIn";
import { changeLine, HOME, STRIP } from "../../copy/home";
import { OPEN_FLUMP_WEBSITE } from "../../copy/navigation";
import { useBudgetEntriesQuery } from "../../data/budget";
import { useCheckInQueries } from "../../data/checkIn";
import { useDelayedLoading } from "../../data/useDelayedLoading";
import { checkInRow } from "../../features/check-in/checkInFlow";
import { type CheckInDataState, londonToday } from "../../features/check-in/useCheckInData";
import { type HomeDataState, useHomeData } from "../../features/home/useHomeData";
import type { WebLink } from "../../navigation/shell";
import { NotSetUp } from "../NotSetUp";
import { TermsRequired } from "../TermsRequired";

/** Home sits under the tab header and above the tab bar, which pad the top and bottom. */
const TAB_EDGES = ["right", "left"] as const;

/** The website pages Home links to until the app has them (S8, S10). */
export interface HomeWebLinks {
  /** Web's onboarding, for a person who has not finished setting up. */
  setUp: WebLink;
  /** Where an account is added (S8). */
  addAccount: WebLink;
  /** Where a home estimate is added (S8). */
  addEstimate: WebLink;
  /** Web's budget page, where a budget is added (S10). */
  addBudget: WebLink;
  /** Web's budget page, where spending is added to a budget that holds income only (S10). */
  addSpending: WebLink;
}

export interface HomeProps {
  /** Sign out, offered by the terms screen; otherwise it lives in the More list (S4). */
  onSignOut(): void;
  /** The website, for the terms screen. */
  marketingOrigin: string;
  links: HomeWebLinks;
  onOpenCheckIn(): void;
  /** Net worth history (S6), opened from the trend bars and the link under them. */
  onOpenHistory(): void;
  /** Opens the app's net worth choices (Settings, Profile, E12 S9). */
  onChangeWhatCounts(): void;
  /** Injected clock for tests. */
  now?: () => Date;
}

const open = (link: WebLink) => () => void Linking.openURL(link.url);

/**
 * The Home tab (E12 S5, plan 9.8; the strip since S5b, 9.8b): the net worth hero with its change
 * and trend bars, the line saying what the figure leaves out, the rates notice when one is due, the
 * two-figure strip, then the check-in row when one is due. Offline is the shell's (the route shows
 * `Offline`); terms and setup are their own screens in the tab.
 */
export function Home({
  onSignOut,
  onOpenCheckIn,
  onOpenHistory,
  onChangeWhatCounts,
  marketingOrigin,
  links,
  now = () => new Date(),
}: HomeProps) {
  const { home, checkIn } = useHomeData(now);
  const { refreshAll } = useCheckInQueries();
  // Pull to refresh reads again everything Home shows: the check-in's four reads and the budget.
  const budget = useBudgetEntriesQuery();
  const onRefresh = () => Promise.all([refreshAll(), budget.refetch()]).then(() => undefined);
  // The terms changed while signed in (PR #939): every read is refused until they are agreed.
  if (home.status === "error" && home.problem === "termsNotAccepted") {
    return (
      <TermsRequired
        marketingOrigin={marketingOrigin}
        onRetry={home.retry}
        onSignOut={onSignOut}
        edges={TAB_EDGES}
      />
    );
  }
  return (
    <HomeBody
      home={home}
      checkIn={checkIn}
      links={links}
      onOpenCheckIn={onOpenCheckIn}
      onOpenHistory={onOpenHistory}
      onRefresh={onRefresh}
      onChangeWhatCounts={onChangeWhatCounts}
      now={now}
    />
  );
}

function HomeBody({
  home,
  checkIn,
  links,
  onOpenCheckIn,
  onOpenHistory,
  onRefresh,
  onChangeWhatCounts,
  now,
}: {
  home: HomeDataState;
  checkIn: CheckInDataState;
  links: HomeWebLinks;
  onOpenCheckIn(): void;
  onOpenHistory(): void;
  onRefresh(): Promise<void>;
  onChangeWhatCounts(): void;
  now: () => Date;
}) {
  // Nothing for 200 ms, then blocks the hero's and the strip's size for at least 400 ms, on one
  // timer so both arrive together. A refetch keeps what is shown.
  const skeleton = useDelayedLoading(home.status === "loading");
  if (home.status === "notSetUp") return <NotSetUp setUp={links.setUp} edges={TAB_EDGES} />;
  return (
    <Screen edges={TAB_EDGES} testID="home" onRefresh={onRefresh}>
      {/* Above the hero, where web's dashboard puts TaxRatesStatusBanner (HomeDashboard). */}
      {home.status === "ready" && home.strip.status === "ready" ? (
        <TaxRatesStatusBanner rates={home.strip.value.ratesNotice} />
      ) : null}
      <NetWorth
        home={home}
        links={links}
        skeleton={skeleton}
        onOpenHistory={onOpenHistory}
        onChangeWhatCounts={onChangeWhatCounts}
      />
      <Strip home={home} links={links} skeleton={skeleton} />
      <CheckInRow data={checkIn} onOpen={onOpenCheckIn} now={now} />
    </Screen>
  );
}

/**
 * The two-figure strip under the hero, or its blocks while loading. Nothing
 * after a failed read: the hero's place says what went wrong, never the budget prompt.
 */
function Strip({
  home,
  links,
  skeleton,
}: {
  home: Exclude<HomeDataState, { status: "notSetUp" }>;
  links: HomeWebLinks;
  skeleton: boolean;
}) {
  if (home.status === "error") return null;
  if (home.status === "loading" || skeleton) {
    return skeleton ? (
      <KpiStrip
        loading
        onAddBudget={open(links.addBudget)}
        onAddSpending={open(links.addSpending)}
      />
    ) : null;
  }
  if (home.strip.status === "outOfStep") {
    // Only the strip's own facts could not be read: the hero and the check-in row stay.
    return (
      <ErrorState
        heading={STRIP.loadErrorHeading}
        body={CHECK_IN.loadErrorOutOfStepBody}
        retryLabel={CHECK_IN.tryAgain}
        testID="kpi-strip-error"
        retryTestID="kpi-strip-retry"
        onRetry={home.strip.retry}
      />
    );
  }
  const exact = links.addBudget.exact && links.addSpending.exact;
  return (
    <KpiStrip
      strip={home.strip.value}
      onAddBudget={open(links.addBudget)}
      onAddSpending={open(links.addSpending)}
      websiteLabel={exact ? undefined : OPEN_FLUMP_WEBSITE}
    />
  );
}

/** The hero and its one line, or what stands in for them while loading or after a failed read. */
function NetWorth({
  home,
  links,
  skeleton,
  onOpenHistory,
  onChangeWhatCounts,
}: {
  home: Exclude<HomeDataState, { status: "notSetUp" }>;
  links: HomeWebLinks;
  skeleton: boolean;
  onOpenHistory(): void;
  onChangeWhatCounts(): void;
}) {
  if (home.status === "error") {
    // Never "Add an account" or £0 for a failed read; out of step never blames the connection.
    return (
      <ErrorState
        heading={CHECK_IN.loadErrorHeading}
        body={
          home.problem === "outOfStep" ? CHECK_IN.loadErrorOutOfStepBody : CHECK_IN.loadErrorBody
        }
        retryLabel={CHECK_IN.tryAgain}
        testID="home-error"
        retryTestID="home-retry"
        onRetry={home.retry}
      />
    );
  }
  if (home.status === "loading" || skeleton) {
    return skeleton ? (
      <HeroFigure
        label={HOME.heroLabel}
        value={null}
        loading
        loadingLabel={HOME.loading}
        // Room for the trend bars, which most households with a few check-ins have: a hero
        // without them (under three recorded months) is that much shorter when it arrives.
        loadingSlotHeight={TREND_PLOT_HEIGHT}
        testID="home-hero-loading"
      />
    ) : null;
  }
  const { hero } = home;
  if (!hero) {
    return (
      <HeroFigure
        label={HOME.heroLabel}
        value={null}
        emptyPrompt={HOME.emptyPrompt}
        emptyAction={{
          label: links.addAccount.exact ? HOME.addAccount : OPEN_FLUMP_WEBSITE,
          onPress: open(links.addAccount),
          testID: "home-add-account",
        }}
        testID="home-empty"
      />
    );
  }
  return (
    <>
      <HeroFigure
        label={hero.homeCounted ? HOME.heroLabelWithHome : HOME.heroLabel}
        value={hero.netWorth}
        change={hero.change ? changeLine(hero.change, hero.currentMonth) : null}
        testID="home-hero"
      >
        {hero.trend ? (
          // A touch on the bars opens history. The touch is not a stop of its own for a screen
          // reader, which reads the bars' list and then meets the link below (plan 9.9).
          <Pressable
            accessible={false}
            accessibilityLabel={ACCOUNTS.seeHowItHasChanged}
            testID="home-trend-open-history"
            onPress={onOpenHistory}
          >
            <NetWorthTrendBars trend={hero.trend} />
          </Pressable>
        ) : null}
      </HeroFigure>
      {hero.trend ? (
        <Button
          label={ACCOUNTS.seeHowItHasChanged}
          variant="link"
          accessibilityRole="link"
          testID="home-view-history"
          onPress={onOpenHistory}
        />
      ) : null}
      <NetWorthBasisLine
        leftOut={hero.leftOut}
        onChangeWhatCounts={onChangeWhatCounts}
        onAddEstimate={open(links.addEstimate)}
        estimateWebsiteLabel={links.addEstimate.exact ? undefined : OPEN_FLUMP_WEBSITE}
      />
    </>
  );
}

/**
 * The way into the monthly check-in, as web's dashboard row: one line and one button, only while
 * this month's check-in is due. "Continue check-in" comes from the engine's
 * `selectCheckInPartDone`, never worked out here.
 */
function CheckInRow({
  data,
  onOpen,
  now,
}: {
  data: CheckInDataState;
  onOpen(): void;
  now: () => Date;
}) {
  const row = checkInRow(data, londonToday(now()));
  if (!row) return null;
  return (
    <Card testID="check-in-row">
      <Text accessibilityRole="header" textStyle="heading.sm">
        {CHECK_IN.rowHeading}
      </Text>
      <Text color="secondary">{row.line}</Text>
      <Button label={row.action} testID="check-in-row-action" onPress={onOpen} />
    </Card>
  );
}
