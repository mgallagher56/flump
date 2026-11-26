import type { FC } from "react";
import type { GsapKit } from "../shared/gsapKit";
import { formatGbp } from "../shared/sampleData";
import { formatGbpPence, PAYSLIP } from "./data";
import { Scene } from "./Scene";

/**
 * Scrubbed: the payslip arrives folded in three, tilted away. The lower third swings down from
 * behind, then the top third swings up off the front (each fold shades as it turns from the
 * light), the sheet lies flat, and a rule draws under the take-home figure.
 */
const setup = ({ gsap }: GsapKit, root: HTMLElement) => {
  const sheet = root.querySelector<HTMLElement>(".p5-slip");
  if (!sheet) return;
  const tl = gsap.timeline({
    defaults: { ease: "flumpInOut" },
    scrollTrigger: { trigger: sheet, start: "top 85%", end: "bottom 50%", scrub: 0.7 },
  });
  tl.from(sheet, { rotationX: 38, y: 40, duration: 1.6, ease: "flump" }, 0)
    .from(".p5-slip__panel--bottom", { rotationX: 178, duration: 1 }, 0.1)
    .from(".p5-slip__panel--bottom .p5-slip__shade", { opacity: 0.55, duration: 1 }, 0.1)
    .from(".p5-slip__panel--top", { rotationX: -178, duration: 1 }, 0.7)
    .from(".p5-slip__panel--top .p5-slip__shade", { opacity: 0.55, duration: 1 }, 0.7)
    .from(".p5-slip__rule", { scaleX: 0, duration: 0.6, ease: "flump" }, 1.6)
    .from(".p5-slip__note", { opacity: 0, y: 6, duration: 0.5, ease: "flump" }, 1.8);
};

export const PayScene: FC = () => (
  <Scene
    areaKey="pay"
    layout="left"
    note={`In this example: a salary of ${formatGbp(PAYSLIP.salary)} a year, worked out under this tax year's rules.`}
    setup={setup}
  >
    <div className="p5-pay">
      <article aria-label="Example payslip" className="p5-slip">
        <div className="p5-slip__panel p5-slip__panel--top">
          <div className="p5-slip__face">
            <p className="p5-slip__head">
              <span>Payslip</span>
              <span className="p5-slip__tag">Example, one month</span>
            </p>
            <dl className="p5-slip__rows">
              <div>
                <dt>Salary</dt>
                <dd className="tabular-nums">{formatGbp(PAYSLIP.salary)} a year</dd>
              </div>
              <div>
                <dt>Pay this month</dt>
                <dd className="tabular-nums">{formatGbpPence(PAYSLIP.gross)}</dd>
              </div>
            </dl>
          </div>
          <span aria-hidden="true" className="p5-slip__back" />
          <span aria-hidden="true" className="p5-slip__shade" />
        </div>
        <div className="p5-slip__panel p5-slip__panel--middle">
          <div className="p5-slip__face">
            <dl className="p5-slip__rows">
              {PAYSLIP.rows.map((row) => (
                <div key={row.id}>
                  <dt>{row.label}</dt>
                  <dd className="tabular-nums">{formatGbpPence(row.amount)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <div className="p5-slip__panel p5-slip__panel--bottom">
          <div className="p5-slip__face">
            <p className="p5-slip__net">
              <span>Take-home pay</span>
              <strong className="tabular-nums">{formatGbpPence(PAYSLIP.net)}</strong>
            </p>
            <span aria-hidden="true" className="p5-slip__rule" />
            <p className="p5-slip__note">
              Rounded to {formatGbp(PAYSLIP.budgetNet)} in the budget above.
            </p>
          </div>
          <span aria-hidden="true" className="p5-slip__back" />
          <span aria-hidden="true" className="p5-slip__shade" />
        </div>
      </article>
    </div>
  </Scene>
);
