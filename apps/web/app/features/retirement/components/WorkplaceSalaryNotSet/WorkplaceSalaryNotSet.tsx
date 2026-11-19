import type { FC } from "react";
import { Link } from "react-router";
import { link, text } from "./WorkplaceSalaryNotSet.styles";

/** The Pension page's details section, where the salary and rates are saved. */
export const PENSION_DETAILS_PATH = "/app/pension#pension-details";

export const WORKPLACE_SALARY_NOT_SET_TEXT =
  "Workplace pension: your salary is not set, so your contributions are not included.";

/**
 * Shown under the Retirement projection when a workplace pension rate is saved but no salary is
 * (`workplaceSalaryNotSet`): the contribution in pounds cannot be worked out, so the projection
 * leaves it out and says so, rather than using a silent £0 (system audit leftovers, item 1).
 */
export const WorkplaceSalaryNotSet: FC = () => (
  <p className={text()}>
    {WORKPLACE_SALARY_NOT_SET_TEXT}{" "}
    <Link className={link()} to={PENSION_DETAILS_PATH}>
      Add your salary on the Pension page
    </Link>
  </p>
);

export default WorkplaceSalaryNotSet;
