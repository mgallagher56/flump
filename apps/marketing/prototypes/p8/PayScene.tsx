import type { FC } from "react";
import { formatGbp } from "../shared/sampleData";
import { scrubFor } from "./calm";
import { Scene, type SceneSetup } from "./Scene";
import { formatGbpPence, PAYSLIP } from "./sceneData";

/**
 * Scrubbed (prototype 5, slowed): the payslip arrives folded in three, tipped back only a little.
 * The lower third turns down from behind, then the top third turns up off the front (each fold
 * shades as it turns from the light), the sheet lies flat, and a rule draws under the take-home
 * figure. The folds are the unfolding itself, so they turn the whole way, slowly and one at a time.
 */
const setup: SceneSetup = ({ gsap }, root, pace) => {
  const sheet = root.querySelector<HTMLElement>(".p8-s-slip");
  if (!sheet) return;
  const tl = gsap.timeline({
    defaults: { ease: "calmInOut" },
    scrollTrigger: scrubFor(sheet, pace, 1.5, "top 92%"),
  });
  tl.from(sheet, { rotationX: 6, y: 20, opacity: 0.6, duration: 1.4, ease: "calm" }, 0)
    .from(".p8-s-slip__panel--bottom", { rotationX: 178, duration: 1.4 }, 0.2)
    .from(".p8-s-slip__panel--bottom .p8-s-slip__shade", { opacity: 0.45, duration: 1.4 }, 0.2)
    .from(".p8-s-slip__panel--top", { rotationX: -178, duration: 1.4 }, 1.3)
    .from(".p8-s-slip__panel--top .p8-s-slip__shade", { opacity: 0.45, duration: 1.4 }, 1.3)
    .from(".p8-s-slip__rule", { scaleX: 0, duration: 0.9, ease: "calm" }, 2.6)
    .from(".p8-s-slip__note", { opacity: 0, y: 8, duration: 0.8, ease: "calm" }, 2.9);
};

export const PayScene: FC = () => (
  <Scene
    areaKey="pay"
    tone="card"
    layout="left"
    note={`In this example: a salary of ${formatGbp(PAYSLIP.salary)} a year, worked out under this tax year's rules.`}
    setup={setup}
  >
    <div className="p8-s-pay">
      <article aria-label="Example payslip" className="p8-s-slip">
        <div className="p8-s-slip__panel p8-s-slip__panel--top">
          <div className="p8-s-slip__face">
            <p className="p8-s-slip__head">
              <span>Payslip</span>
              <span className="p8-s-slip__tag">Example, one month</span>
            </p>
            <dl className="p8-s-slip__rows">
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
          <span aria-hidden="true" className="p8-s-slip__back" />
          <span aria-hidden="true" className="p8-s-slip__shade" />
        </div>
        <div className="p8-s-slip__panel p8-s-slip__panel--middle">
          <div className="p8-s-slip__face">
            <dl className="p8-s-slip__rows">
              {PAYSLIP.rows.map((row) => (
                <div key={row.id}>
                  <dt>{row.label}</dt>
                  <dd className="tabular-nums">{formatGbpPence(row.amount)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <div className="p8-s-slip__panel p8-s-slip__panel--bottom">
          <div className="p8-s-slip__face">
            <p className="p8-s-slip__net">
              <span>Take-home pay</span>
              <strong className="tabular-nums">{formatGbpPence(PAYSLIP.net)}</strong>
            </p>
            <span aria-hidden="true" className="p8-s-slip__rule" />
            <p className="p8-s-slip__note">
              Rounded to {formatGbp(PAYSLIP.budgetNet)} in the budget above.
            </p>
          </div>
          <span aria-hidden="true" className="p8-s-slip__back" />
          <span aria-hidden="true" className="p8-s-slip__shade" />
        </div>
      </article>
    </div>
  </Scene>
);
