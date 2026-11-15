import { Button, Card, PageSection } from "@repo/ui";
import { Download } from "lucide-react";
import { type FC, useRef, useState } from "react";
import {
  AccountExportError,
  downloadAccountExport as defaultDownload,
} from "~/features/settings/accountExport";
import { sectionCard, statusText } from "~/features/settings/settings.styles";
import { exportRow } from "./DataExportSection.styles";

type ExportState = "idle" | "pending" | "done" | "rate_limited" | "failed";

const MESSAGES: Partial<Record<ExportState, string>> = {
  done: "Your download has started.",
  rate_limited: "You have tried this a few times in a short while. Wait a little, then try again.",
  failed: "We could not prepare your download. Try again.",
};

export interface DataExportSectionProps {
  /** Injected for tests and stories; defaults to the real download. */
  download?: () => Promise<void>;
}

/** "Download your data": fetches the export file through the web server. */
export const DataExportSection: FC<DataExportSectionProps> = ({ download = defaultDownload }) => {
  const [state, setState] = useState<ExportState>("idle");
  const inFlight = useRef(false);

  const handleDownload = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setState("pending");
    try {
      await download();
      setState("done");
    } catch (error) {
      setState(
        error instanceof AccountExportError && error.reason === "rate_limited"
          ? "rate_limited"
          : "failed",
      );
    } finally {
      inFlight.current = false;
    }
  };

  const message = MESSAGES[state];
  const isError = state === "failed" || state === "rate_limited";

  return (
    <PageSection
      description="Get a copy of your Flump data as one JSON file."
      headingId="export-data-heading"
      icon={Download}
      id="export-data-section"
      title="Download your data"
      tone="neutral"
    >
      <Card className={sectionCard()}>
        <div className={exportRow()}>
          <Button
            id="export-data-button"
            data-testid="export-data-button"
            size="sm"
            type="button"
            variant="outline"
            pending={state === "pending"}
            onClick={handleDownload}
          >
            {state === "pending" ? "Preparing your file" : "Download your data"}
          </Button>
          {/* The status region stays mounted so the success message is announced; errors are alerts. */}
          <div role="status">
            {message && !isError ? (
              <p className={statusText({ tone: "positive" })}>{message}</p>
            ) : null}
          </div>
          {message && isError ? (
            <p className={statusText({ tone: "danger" })} role="alert">
              {message}
            </p>
          ) : null}
        </div>
      </Card>
    </PageSection>
  );
};
