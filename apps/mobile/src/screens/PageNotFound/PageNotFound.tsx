import { Button } from "../../components/Button";
import {
  GO_TO_HOME,
  GO_TO_MORE,
  LINK_NOT_FOUND_BODY,
  PAGE_NOT_FOUND_BODY,
  PAGE_NOT_FOUND_HEADING,
} from "../../copy/navigation";
import { StatusMessage } from "../StatusMessage";

const WAYS = {
  more: { body: PAGE_NOT_FOUND_BODY, label: GO_TO_MORE },
  home: { body: LINK_NOT_FOUND_BODY, label: GO_TO_HOME },
} as const;

/**
 * A `flump://` link the app does not know, with one way back: to More for an unknown
 * `flump://page/...` (its page belongs there), to Home for any other path.
 */
export function PageNotFound({ way, onGo }: { way: keyof typeof WAYS; onGo(): void }) {
  return (
    <StatusMessage
      heading={PAGE_NOT_FOUND_HEADING}
      body={WAYS[way].body}
      edges={["right", "bottom", "left"]}
    >
      <Button label={WAYS[way].label} testID="page-not-found-action" onPress={onGo} />
    </StatusMessage>
  );
}
