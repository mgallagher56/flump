import { ExampleTag } from "@repo/ui";
import type { FC } from "react";
import { formatGbp, formatGbpPence } from "../CountUpFigure/figureFormats";
import * as s from "./Payslip.styles";

export interface PayslipProps {
  /** `setPiece`: an area page's set piece, sized as the approved area prototypes. */
  size?: "journey" | "setPiece";
  /** Salary a year, in pounds. */
  salary: number;
  /** Pay this month, before deductions. */
  gross: number;
  /** The month's deductions, in order. */
  rows: readonly { readonly id: string; readonly label: string; readonly amount: number }[];
  /** Take-home pay this month. */
  net: number;
}

/**
 * The unfolding payslip, one of the two approved set pieces (STYLE-GUIDE 11.2), from prototype
 * 11's `PayVisual`: a one-month payslip tagged "Example", folded in three. It renders lying open
 * (MK1); `unfoldMoment` opens it once: the lower third turns down from behind, then the top third
 * up off the front, each shading as it turns. Figures in tabular en-GB pounds.
 */
export const Payslip: FC<PayslipProps> = ({ salary, gross, rows, net, size = "journey" }) => (
  <div className={s.wrap}>
    <article aria-label="Example payslip" className={s.slip} data-payslip="">
      <div className={s.panel({ fold: "top", size })} data-fold="top">
        <div className={s.face({ fold: "top" })}>
          <p className={s.head}>
            <span>Payslip, one month</span>
            <ExampleTag variant="paper" />
          </p>
          <dl className={s.rows}>
            <div>
              <dt>Salary</dt>
              <dd>{formatGbp(salary)} a year</dd>
            </div>
            <div>
              <dt>Pay this month</dt>
              <dd>{formatGbpPence(gross)}</dd>
            </div>
          </dl>
        </div>
        <span aria-hidden="true" className={s.back({ fold: "top" })} />
        <span aria-hidden="true" className={s.shade({ fold: "top" })} data-fold-shade="" />
      </div>
      <div className={s.panel({ fold: "middle", size })}>
        <div className={s.face({ fold: "middle" })}>
          <dl className={s.rows}>
            {rows.map((row) => (
              <div key={row.id}>
                <dt>{row.label}</dt>
                <dd>{formatGbpPence(row.amount)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className={s.panel({ fold: "bottom", size })} data-fold="bottom">
        <div className={s.face({ fold: "bottom" })}>
          <p className={s.net}>
            <span>Take-home pay</span>
            <strong>{formatGbpPence(net)}</strong>
          </p>
          <span aria-hidden="true" className={s.rule} data-payslip-rule="" />
        </div>
        <span aria-hidden="true" className={s.back({ fold: "bottom" })} />
        <span aria-hidden="true" className={s.shade({ fold: "bottom" })} data-fold-shade="" />
      </div>
    </article>
  </div>
);
