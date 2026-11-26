import type { FC } from "react";
import type { GsapKit } from "../shared/gsapKit";
import { type PaceState, SCROLL } from "../shared/pace";
import { formatGbp } from "../shared/sampleData";
import { momentScroll } from "./moments";
import { Scene, Sr } from "./Scene";
import { formatGbpPence, PAYSLIP } from "./sceneData";

/**
 * Scrubbed, slowly: the payslip arrives folded in three. The lower third swings down from behind,
 * then the top third swings up off the front (each fold shades as it turns from the light), and
 * the take-home figure counts up to its value as the sheet lies open. The sheet itself only rises
 * a little; the folds are the one turning movement, and the scroll drives them.
 */
const setup = ({ gsap }: GsapKit, root: HTMLElement, pace: PaceState) => {
  const sheet = root.querySelector<HTMLElement>(".p10-sc-slip");
  const net = root.querySelector<HTMLElement>("[data-p10-net]");
  if (!sheet || !net) return undefined;
  const proxy = { v: 0 };
  const write = () => {
    net.textContent = formatGbpPence(proxy.v);
  };
  const tl = gsap.timeline({
    defaults: { ease: "calmInOut" },
    onUpdate: write,
    scrollTrigger: momentScroll(sheet, pace, SCROLL.moment * 1.5),
  });
  tl.from(sheet, { y: 20, opacity: 0.4, duration: 1, ease: "calm" }, 0)
    .from(".p10-sc-slip__panel--bottom", { rotationX: 178, duration: 1.2 }, 0.2)
    .from(".p10-sc-slip__panel--bottom .p10-sc-slip__shade", { opacity: 0.5, duration: 1.2 }, 0.2)
    .from(".p10-sc-slip__panel--top", { rotationX: -178, duration: 1.2 }, 1)
    .from(".p10-sc-slip__panel--top .p10-sc-slip__shade", { opacity: 0.5, duration: 1.2 }, 1)
    .fromTo(proxy, { v: 0 }, { v: PAYSLIP.net, duration: 1.4, ease: "calm" }, 0.9)
    .from(".p10-sc-slip__rule", { scaleX: 0, duration: 0.8, ease: "calm" }, 1.9)
    .from(".p10-sc-slip__note", { opacity: 0, y: 8, duration: 0.6, ease: "calm" }, 2.1);
  return () => {
    net.textContent = formatGbpPence(PAYSLIP.net);
  };
};

export const PayScene: FC = () => (
  <Scene
    areaKey="pay"
    bubbles="b"
    layout="right"
    tone="card"
    note={`In this example: a salary of ${formatGbp(PAYSLIP.salary)} a year, worked out under this tax year's rules.`}
    setup={setup}
  >
    <div className="p10-sc-pay">
      <article aria-label="Example payslip" className="p10-sc-slip">
        <div className="p10-sc-slip__panel p10-sc-slip__panel--top">
          <div className="p10-sc-slip__face">
            <p className="p10-sc-slip__head">
              <span>Payslip</span>
              <span className="p10-sc-slip__tag">Example, one month</span>
            </p>
            <dl className="p10-sc-slip__rows">
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
          <span aria-hidden="true" className="p10-sc-slip__back" />
          <span aria-hidden="true" className="p10-sc-slip__shade" />
        </div>
        <div className="p10-sc-slip__panel p10-sc-slip__panel--middle">
          <div className="p10-sc-slip__face">
            <dl className="p10-sc-slip__rows">
              {PAYSLIP.rows.map((row) => (
                <div key={row.id}>
                  <dt>{row.label}</dt>
                  <dd className="tabular-nums">{formatGbpPence(row.amount)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <div className="p10-sc-slip__panel p10-sc-slip__panel--bottom">
          <div className="p10-sc-slip__face">
            <p className="p10-sc-slip__net">
              <span>Take-home pay</span>
              <strong className="tabular-nums">
                <Sr>{formatGbpPence(PAYSLIP.net)}</Sr>
                <span aria-hidden="true" data-p10-net="">
                  {formatGbpPence(PAYSLIP.net)}
                </span>
              </strong>
            </p>
            <span aria-hidden="true" className="p10-sc-slip__rule" />
            <p className="p10-sc-slip__note">
              Rounded to {formatGbp(PAYSLIP.budgetNet)} in the budget.
            </p>
          </div>
          <span aria-hidden="true" className="p10-sc-slip__back" />
          <span aria-hidden="true" className="p10-sc-slip__shade" />
        </div>
      </article>
    </div>
  </Scene>
);
