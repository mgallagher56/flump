import { Linking } from "react-native";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { ErrorState } from "../../components/ErrorState";
import { HeroFigure } from "../../components/HeroFigure";
import { NetWorthBasisLine } from "../../components/NetWorthBasisLine";
import { NetWorthTrendBars } from "../../components/NetWorthTrendBars";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { CHECK_IN } from "../../copy/checkIn";
import { changeLine, HOME } from "../../copy/home";
import { OPEN_FLUMP_WEBSITE } from "../../copy/navigation";
import { useDelayedLoading } from "../../data/useDelayedLoading";
import { checkInRow } from "../../features/check-in/checkInFlow";
import { type CheckInDataState, londonToday } from "../../features/check-in/useCheckInData";
import { type HomeDataState, useHomeData } from "../../features/home/useHomeData";
import type { WebLink } from "../../navigation/shell";
import { NotSetUp } from "../NotSetUp";
import { TermsRequired } from "../TermsRequired";

/** Home sits under the tab header and above the tab bar, which pad the top and bottom. */
const TAB_EDGES = ["right", "left"] as const;

/** The website pages Home links to until the app has them (S8, S9). */
export interface HomeWebLinks {
  /** Web's onboarding, for a person who has not finished setting up. */
  setUp: WebLink;
  /** Where an account is added (S8). */
  addAccount: WebLink;
  /** The net worth choices in Settings (S9). */
  changeWhatCounts: WebLink;
  /** Where a home estimate is added (S8). */
  addEstimate: WebLink;
}

export interface HomeProps {
  /** Sign out, offered by the terms screen; otherwise it lives in the More list (S4). */
  onSignOut(): void;
  /** The website, for the terms screen. */
  marketingOrigin: string;
  links: HomeWebLinks;
  onOpenCheckIn(): void;
  /** Injected clock for tests. */
  now?: () => Date;
}

const open = (link: WebLink) => () => void Linking.openURL(link.url);

/**
 * The Home tab (E12 S5, plan 9.8): the net worth hero with its change and trend bars, the line
 * saying what the figure leaves out, then the check-in row when one is due. Offline is the shell's
 * (the route shows `Offline`); terms and setup are their own screens in the tab.
 */
export function Home({
  onSignOut,
  onOpenCheckIn,
  marketingOrigin,
  links,
  now = () => new Date(),
}: HomeProps) {
  const { home, checkIn } = useHomeData(now);
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
  if (home.status === "notSetUp") return <NotSetUp setUp={links.setUp} edges={TAB_EDGES} />;
  return (
    <Screen edges={TAB_EDGES} testID="home">
      <NetWorth home={home} links={links} />
      <CheckInRow data={checkIn} onOpen={onOpenCheckIn} now={now} />
    </Screen>
  );
}

/** The hero and its one line, or what stands in for them while loading or after a failed read. */
function NetWorth({
  home,
  links,
}: {
  home: Exclude<HomeDataState, { status: "notSetUp" }>;
  links: HomeWebLinks;
}) {
  // Nothing for 200 ms, then blocks the hero's size for at least 400 ms. A refetch keeps the hero.
  const skeleton = useDelayedLoading(home.status === "loading");
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
  const exact = links.changeWhatCounts.exact && links.addEstimate.exact;
  return (
    <>
      <HeroFigure
        label={hero.homeCounted ? HOME.heroLabelWithHome : HOME.heroLabel}
        value={hero.netWorth}
        change={hero.change ? changeLine(hero.change, hero.currentMonth) : null}
        testID="home-hero"
      >
        {hero.trend ? <NetWorthTrendBars trend={hero.trend} /> : null}
      </HeroFigure>
      <NetWorthBasisLine
        leftOut={hero.leftOut}
        onChangeWhatCounts={open(links.changeWhatCounts)}
        onAddEstimate={open(links.addEstimate)}
        websiteLabel={exact ? undefined : OPEN_FLUMP_WEBSITE}
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
