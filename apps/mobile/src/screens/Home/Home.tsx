import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Text } from "../../components/Text";
import { SIGN_OUT, SIGNED_IN_HEADING } from "../../copy/auth";
import { CHECK_IN } from "../../copy/checkIn";
import { checkInRow } from "../../features/check-in/checkInFlow";
import { londonToday, useCheckInData } from "../../features/check-in/useCheckInData";
import { DevLinks } from "../DevLinks";
import { StatusMessage } from "../StatusMessage";

export interface HomeProps {
  onSignOut(): void;
  onOpenCheckIn(): void;
  /** Injected clock for tests. */
  now?: () => Date;
}

/** The signed-in placeholder until the app shell (S4), with the check-in row when one is due (S3). */
export function Home({ onSignOut, onOpenCheckIn, now = () => new Date() }: HomeProps) {
  return (
    <StatusMessage heading={SIGNED_IN_HEADING}>
      <CheckInRow onOpen={onOpenCheckIn} now={now} />
      <Button label={SIGN_OUT} variant="secondary" onPress={onSignOut} />
      <DevLinks />
    </StatusMessage>
  );
}

/**
 * The way into the monthly check-in, as web's dashboard row: one line and one button, only while
 * this month's check-in is due. "Continue check-in" comes from the engine's
 * `selectCheckInPartDone`, never worked out here.
 */
function CheckInRow({ onOpen, now }: { onOpen(): void; now: () => Date }) {
  const data = useCheckInData(now);
  const row = checkInRow(data, londonToday(now()).month);
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
