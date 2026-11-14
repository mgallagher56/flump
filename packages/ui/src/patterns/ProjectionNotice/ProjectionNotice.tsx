import { Info } from "lucide-react";
import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../../primitives/Icon";
import {
  projectionNotice,
  projectionNoticeIcon,
  projectionNoticeText,
} from "./ProjectionNotice.styles";

/**
 * Interim wording (E19 L-01). It frames every projection as guidance, not advice. The owner and
 * a solicitor own the final text, so this is a placeholder and not a claim of legal review.
 * The wording is unchanged by the Direction C restyle (E15 T2.6).
 */
export const PROJECTION_NOTICE_TEXT =
  "Guidance, not advice. Flump works from the figures you enter and shows estimates, which can differ from what happens in practice. It is not financial, tax, investment or debt advice.";

export interface ProjectionNoticeProps {
  /** Replaces the default wording where a page needs a more specific sentence. */
  children?: ReactNode;
  /**
   * A sentence shown first, inside the same note, before the fixed wording (which stays
   * unchanged). Use it to fold a page's own caveat (for example "Unverified estimate. ...") into
   * the one notice instead of adding a second one (E16 P4.1, P4.3).
   */
  lead?: ReactNode;
  className?: string;
}

/**
 * The page's one "Guidance, not advice" notice (E16 P4). Quiet `note` style: secondary text on the
 * surrounding surface with a top hairline. Place it at the foot of the first region that shows a
 * projection (the `ScenarioZone` footer when the page has one), always visible, once per page.
 */
export const ProjectionNotice: FC<ProjectionNoticeProps> = ({ children, lead, className }) => (
  <div
    aria-label="Guidance, not advice"
    className={cx(projectionNotice(), className)}
    data-notice="projection"
    data-testid="projection-notice"
    role="note"
  >
    <span className={projectionNoticeIcon()}>
      <Icon icon={Info} size="sm" />
    </span>
    <div className={projectionNoticeText()}>
      {lead ? (
        <>
          <span data-notice-lead="">{lead}</span>{" "}
        </>
      ) : null}
      {children ?? PROJECTION_NOTICE_TEXT}
    </div>
  </div>
);

export default ProjectionNotice;
