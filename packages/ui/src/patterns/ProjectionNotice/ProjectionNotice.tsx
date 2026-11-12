import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import { projectionNotice } from "./ProjectionNotice.styles";

/**
 * Interim wording (E19 L-01). It frames every projection as guidance, not advice. The owner and
 * a solicitor own the final text, so this is a placeholder and not a claim of legal review.
 */
export const PROJECTION_NOTICE_TEXT =
  "Guidance, not advice. Flump works from the figures you enter and shows estimates, which can differ from what happens in practice. It is not financial, tax, investment or debt advice.";

export interface ProjectionNoticeProps {
  /** Replaces the default wording where a page needs a more specific sentence. */
  children?: ReactNode;
  className?: string;
}

export const ProjectionNotice: FC<ProjectionNoticeProps> = ({ children, className }) => (
  <aside
    aria-label="Guidance, not advice"
    className={cx(projectionNotice(), className)}
    data-testid="projection-notice"
  >
    {children ?? PROJECTION_NOTICE_TEXT}
  </aside>
);

export default ProjectionNotice;
