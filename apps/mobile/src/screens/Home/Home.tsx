import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Text } from "../../components/Text";
import { SIGNED_IN_HEADING } from "../../copy/auth";
import { CHECK_IN } from "../../copy/checkIn";
import { checkInRow } from "../../features/check-in/checkInFlow";
import {
  type CheckInDataState,
  londonToday,
  useCheckInData,
} from "../../features/check-in/useCheckInData";
import { DevLinks } from "../DevLinks";
import { StatusMessage } from "../StatusMessage";
import { TermsRequired } from "../TermsRequired";

export interface HomeProps {
  /** Sign out, offered by the terms screen; otherwise it lives in the More list (S4). */
  onSignOut(): void;
  /** The website, for the terms screen. */
  marketingOrigin: string;
  onOpenCheckIn(): void;
  /** Injected clock for tests. */
  now?: () => Date;
}

/**
 * The Home tab until S5 brings the figures: the check-in row when one is due (S3). Sign out moved to
 * the More list with the tab bar (S4).
 */
export function Home({
  onSignOut,
  onOpenCheckIn,
  marketingOrigin,
  now = () => new Date(),
}: HomeProps) {
  const data = useCheckInData(now);
  // The terms changed while signed in (PR #939): every read is refused until they are agreed.
  if (data.status === "error" && data.problem === "termsNotAccepted") {
    return (
      <TermsRequired marketingOrigin={marketingOrigin} onRetry={data.retry} onSignOut={onSignOut} />
    );
  }
  return (
    <StatusMessage heading={SIGNED_IN_HEADING}>
      <CheckInRow data={data} onOpen={onOpenCheckIn} now={now} />
      <DevLinks />
    </StatusMessage>
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
