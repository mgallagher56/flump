import { Button } from "../../components/Button";
import { GO_TO_MORE, PAGE_NOT_FOUND_BODY, PAGE_NOT_FOUND_HEADING } from "../../copy/navigation";
import { StatusMessage } from "../StatusMessage";

/** A `flump://page/...` link to a page the app does not know: one way back, to More. */
export function PageNotFound({ onGoToMore }: { onGoToMore(): void }) {
  return (
    <StatusMessage
      heading={PAGE_NOT_FOUND_HEADING}
      body={PAGE_NOT_FOUND_BODY}
      edges={["right", "bottom", "left"]}
    >
      <Button label={GO_TO_MORE} onPress={onGoToMore} />
    </StatusMessage>
  );
}
