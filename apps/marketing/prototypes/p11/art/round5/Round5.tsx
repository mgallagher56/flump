import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { CSSProperties, FC, ReactNode } from "react";
import { DEBT } from "../../../p8/sceneData";
import { formatGbp } from "../../../shared/sampleData";
import { FIG } from "../../hero/pieceData";
import "../art.css";
import "./round5.css";

/*
 * Round five of prototype 11's spot pictures: one glass family, simpler shapes. Each picture is a
 * clear subject drawn as tinted glass (the journey's orbs, in 2D), with any words on a quiet card
 * in the empty-accounts style. Both orb sets are mixed in every picture: sky and teal with violet
 * and rose. Sizes are in em and the frame sizes itself to its container, so the smallest text is
 * held at 12px or more at any width (see round5.css). Nothing moves: safe under reduced motion.
 */

type Tone = "sky" | "teal" | "violet" | "rose";

const Frame: FC<{
  scene: string;
  label: string;
  h: number;
  decorative?: boolean;
  children: ReactNode;
}> = ({ scene, label, h, decorative, children }) => (
  <div className="p11-r5-fit">
    <figure
      aria-hidden={decorative ? "true" : undefined}
      aria-label={decorative ? undefined : label}
      className={`p11-r5 p11-r5--${scene}`}
      role={decorative ? undefined : "img"}
    >
      <div className="p11-r5__stage" style={{ "--h": `${h}em` } as CSSProperties}>
        {children}
      </div>
    </figure>
  </div>
);

/** A positioned box: left, top, width and height in em. */
const u = (n: number) => `calc(var(--p11-r5-u) * ${n})`;
const at = (
  l: number,
  t: number,
  w?: number,
  h?: number,
  extra?: CSSProperties,
): CSSProperties => ({
  left: u(l),
  top: u(t),
  ...(w !== undefined ? { width: u(w) } : {}),
  ...(h !== undefined ? { height: u(h) } : {}),
  ...extra,
});

/** A shape of tinted glass. */
const Glass: FC<{
  tone: Tone;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}> = ({ tone, className = "", style, children }) => (
  <span className={`p11-r5-gl ${className}`} data-tone={tone} style={style}>
    {children}
  </span>
);

/** One of the family's clear glass orbs. */
const Orb: FC<{ tone: Tone; size: number; style?: CSSProperties; children?: ReactNode }> = ({
  tone,
  size,
  style,
  children,
}) => (
  <span
    className="p11-orb p11-r5-orb"
    data-tone={tone}
    style={{ "--orb-size": `${size}em`, ...style } as CSSProperties}
  >
    {children}
  </span>
);

/** A quiet card for words, as on the empty-accounts picture. */
const Card: FC<{ className?: string; style?: CSSProperties; children: ReactNode }> = ({
  className = "",
  style,
  children,
}) => (
  <span className={`p11-r5-card ${className}`} style={style}>
    {children}
  </span>
);

const Example: FC = () => <span className="p11-r5-ex">Example</span>;

/** A dotted path. Coordinates are tenths of an em on a stage 22em wide. */
const Dots: FC<{ d: string; h: number }> = ({ d, h }) => (
  <svg aria-hidden="true" className="p11-r5-dots" viewBox={`0 0 220 ${h * 10}`}>
    <path d={d} />
  </svg>
);

/** A three-leaf sprout in glass greens. */
const Sprout: FC<{ style?: CSSProperties }> = ({ style }) => (
  <svg aria-hidden="true" className="p11-r5-sprout" style={style} viewBox="0 0 40 44">
    <path className="p11-r5-sprout__stem" d="M20 44V18" />
    <path className="p11-r5-sprout__leaf" d="M20 26C10 26 4 20 4 10c10 0 16 6 16 16z" />
    <path className="p11-r5-sprout__leaf" d="M20 22c0-10 6-16 16-16 0 10-6 16-16 16z" />
    <path className="p11-r5-sprout__shine" d="M8 13c3 1 6 3 8 7" />
    <path className="p11-r5-sprout__shine" d="M32 9c-3 1-6 3-8 7" />
  </svg>
);

/** A dashed empty place, waiting for something to be added. */
const Slot: FC<{ style?: CSSProperties; round?: boolean; children?: ReactNode }> = ({
  style,
  round,
  children,
}) => (
  <span className={`p11-r5-slot ${round ? "p11-r5-slot--round" : ""}`} style={style}>
    {children}
  </span>
);

/* =============================================================================================
 * empty-goals: a target with a flag on top.
 * =========================================================================================== */

/** A: the target as a glass orb with its rings, the flag planted in the middle; a goal card. */
export const GoalsA: FC = () => (
  <Frame
    h={15}
    label="A target drawn as a glass orb with a flag in its centre, beside a card for your first goal."
    scene="goals-a"
  >
    <Orb size={9.6} style={at(0.6, 4.2)} tone="violet">
      <span className="p11-r5-target" />
    </Orb>
    <span className="p11-r5-pole" style={at(5.3, 1.2, undefined, 7.9)} />
    <Glass className="p11-r5-flag" style={at(5.5, 1.2, 3.4, 2.4)} tone="teal" />
    <Card className="p11-r5-goalcard" style={at(11.4, 4.6, 10.2)}>
      <span className="p11-r5-title">Your first goal</span>
      <span className="p11-r5-track">
        <span />
      </span>
      <span className="p11-r5-note">Set a target and a date</span>
    </Card>
    <Orb size={1.8} style={at(19.4, 2.2)} tone="sky" />
    <Orb size={1.2} style={at(10.2, 12.4)} tone="rose" />
  </Frame>
);

/** B: a dotted path climbing from today to a flag on a summit. */
export const GoalsB: FC = () => (
  <Frame
    h={15}
    label="A dotted path climbing from today to a flag that marks your goal."
    scene="goals-b"
  >
    <Card className="p11-r5-panel" style={at(0.4, 0.6, 21.2, 13.8)}>
      {null}
    </Card>
    <span className="p11-r5-grid" style={at(1.4, 2, 19.2, 11.4)} />
    <Dots d="M42 118C80 112 96 84 124 76S170 52 176 44" h={15} />
    <Orb size={2.6} style={at(2.9, 10.5)} tone="sky" />
    <Glass className="p11-r5-summit" style={at(14.6, 4.6, 6.2, 3.2)} tone="violet" />
    <span className="p11-r5-pole" style={at(17.6, 1.2, undefined, 3.6)} />
    <Glass className="p11-r5-flag" style={at(17.8, 1.2, 2.8, 2)} tone="teal" />
    <span className="p11-r5-label" style={at(1.8, 9)}>
      Today
    </span>
    <span className="p11-r5-label p11-r5-label--strong" style={at(14.4, 8.6)}>
      Your goal
    </span>
    <Orb size={1.1} style={at(11.6, 2.2)} tone="rose" />
  </Frame>
);

/* =============================================================================================
 * empty-savings: a savings jar with coins waiting inside.
 * =========================================================================================== */

const Coin: FC<{ tone: Tone; style: CSSProperties }> = ({ tone, style }) => (
  <Glass className="p11-r5-coin" style={style} tone={tone} />
);

/** A: a glass jar, its label card, coins resting at the bottom. */
export const SavingsA: FC = () => (
  <Frame
    h={15.5}
    label={`A glass savings jar with coins inside, labelled cash and savings, ${FIG.savings}, example.`}
    scene="savings-a"
  >
    <Orb size={2.4} style={at(16.6, 1.4)} tone="rose" />
    <Orb size={1.4} style={at(3.2, 3)} tone="violet" />
    <Glass className="p11-r5-lid" style={at(7.4, 0.8, 7.2, 1.5)} tone="teal" />
    <Glass className="p11-r5-jar" style={at(5.8, 2.1, 10.4, 12.6)} tone="sky" />
    <Coin style={at(7, 12.4, 4.2, 1.5)} tone="teal" />
    <Coin style={at(10.8, 12.5, 4.2, 1.5)} tone="violet" />
    <Coin style={at(8.9, 11.5, 4.2, 1.5)} tone="sky" />
    <Coin style={at(8.9, 10.5, 4.2, 1.5)} tone="rose" />
    <Card className="p11-r5-label-card" style={at(6.2, 3.4, 9.6)}>
      <span className="p11-r5-small">Cash and savings</span>
      <span className="p11-r5-fig tabular-nums">{FIG.savings}</span>
      <Example />
    </Card>
  </Frame>
);

/** B: columns of glass coins growing, with the savings card. */
export const SavingsB: FC = () => {
  const columns: { tone: Tone; count: number; left: number }[] = [
    { tone: "sky", count: 2, left: 6.4 },
    { tone: "teal", count: 4, left: 11.2 },
    { tone: "violet", count: 6, left: 16 },
  ];
  return (
    <Frame
      h={15}
      label={`Three growing columns of glass coins beside a card: cash and savings, ${FIG.savings}, ${FIG.savingsRate}, example.`}
      scene="savings-b"
    >
      <Dots d="M74 92C110 70 140 54 196 28" h={15} />
      <span className="p11-r5-shelf" style={at(5.4, 13.2, 16)} />
      {columns.map((col) =>
        Array.from({ length: col.count }, (_, i) => (
          <Coin
            key={`${col.tone}-${i}`}
            style={at(col.left, 11.8 - i * 1.15, 4.4, 1.6)}
            tone={col.tone}
          />
        )),
      )}
      <Card className="p11-r5-label-card" style={at(0.4, 0.6, 10.8)}>
        <span className="p11-r5-small">Cash and savings</span>
        <span className="p11-r5-fig tabular-nums">{FIG.savings}</span>
        <span className="p11-r5-row">
          <span className="p11-r5-small tabular-nums">{FIG.savingsRate}</span>
          <Example />
        </span>
      </Card>
      <Orb size={1.6} style={at(1.4, 10.6)} tone="rose" />
    </Frame>
  );
};

/* =============================================================================================
 * empty-debt: stepping stones lowering towards zero.
 * =========================================================================================== */

const midDebt = DEBT.points.find(
  (p) => p.month === 0 && p.year === (DEBT.points[0]?.year ?? 0) + 2,
);
const DEBT_STEPS = [
  { when: DEBT.startLabel, value: formatGbp(DEBT.start) },
  ...(midDebt
    ? [{ when: midDebt.long, value: formatGbp(Math.round(midDebt.value / 100) * 100) }]
    : []),
  { when: DEBT.endLabel, value: formatGbp(0) },
];
const debtLabel = `Example card and loan balance stepping down: ${DEBT_STEPS.map((s) => `${s.value} in ${s.when}`).join(", ")}.`;

/** A: three glass stepping stones, each lower, each with its balance. */
export const DebtA: FC = () => {
  const tones: Tone[] = ["violet", "sky", "teal"];
  return (
    <Frame h={15.5} label={debtLabel} scene="debt-a">
      {DEBT_STEPS.map((step, i) => (
        <span
          className="p11-r5-stone-wrap"
          key={step.when}
          style={at(0.4 + i * 7.2, 1 + i * 4.3, 7)}
        >
          <span className="p11-r5-stone-text">
            <span className="p11-r5-fig p11-r5-fig--sm tabular-nums">{step.value}</span>
            <span className="p11-r5-small">{step.when}</span>
          </span>
          <Glass className="p11-r5-stone" tone={tones[i] ?? "sky"} />
        </span>
      ))}
      <span className="p11-r5-ex-pos" style={at(15.4, 1)}>
        <Example />
      </span>
    </Frame>
  );
};

/** B: a card with the balance as glass bars stepping down to a zero orb. */
export const DebtB: FC = () => {
  const bars: { h: number; tone: Tone }[] = [
    { h: 5.6, tone: "violet" },
    { h: 4.2, tone: "violet" },
    { h: 2.8, tone: "sky" },
    { h: 1.4, tone: "sky" },
  ];
  return (
    <Frame h={15} label={debtLabel} scene="debt-b">
      <Card className="p11-r5-panel" style={at(0.4, 0.4, 21.2, 14.2)}>
        {null}
      </Card>
      <span className="p11-r5-head" style={at(1.6, 1.4, 18.8)}>
        <span className="p11-r5-title">Card and loan</span>
        <Example />
      </span>
      <span className="p11-r5-fig tabular-nums" style={at(1.6, 3.4)}>
        {DEBT_STEPS[0]?.value}
      </span>
      {bars.map((bar, i) => (
        <Glass
          className="p11-r5-bar"
          key={bar.h}
          style={at(2 + i * 3.6, 11.4 - bar.h, 2.6, bar.h)}
          tone={bar.tone}
        />
      ))}
      <Orb size={2.4} style={at(16.6, 9)} tone="teal">
        <span className="p11-r5-orb-text tabular-nums">£0</span>
      </Orb>
      <span className="p11-r5-axis" style={at(1.6, 11.6, 18.8)} />
      <span className="p11-r5-small" style={at(1.6, 12.2)}>
        {DEBT.startLabel}
      </span>
      <span className="p11-r5-small p11-r5-end" style={at(13.2, 12.2, 7.2)}>
        {DEBT.endLabel}
      </span>
      <Orb size={1.2} style={at(13.4, 4.4)} tone="rose" />
    </Frame>
  );
};

/* =============================================================================================
 * empty-pension: a potted sprout waiting for pension pots.
 * =========================================================================================== */

/** A: a glass pot with a sprout and its label, two dashed places for more pots. */
export const PensionA: FC = () => (
  <Frame
    h={15.5}
    label={`A sprout in a glass pot labelled pension, ${FIG.pension}, example, with two empty places for more pots.`}
    scene="pension-a"
  >
    <Sprout style={at(4.4, 0.6, 4.8, 5.3)} />
    <Glass className="p11-r5-rim" style={at(1.4, 5.4, 10.8, 1.7)} tone="teal" />
    <Glass className="p11-r5-pot" style={at(2.2, 6.7, 9.2, 8.2)} tone="sky" />
    <Card className="p11-r5-label-card" style={at(12.4, 7.6, 9.2)}>
      <span className="p11-r5-small">Pension</span>
      <span className="p11-r5-fig tabular-nums">{FIG.pension}</span>
      <Example />
    </Card>
    <Slot round style={at(13.6, 2, 3.6, 3.6)}>
      +
    </Slot>
    <Orb size={1.8} style={at(18.4, 3)} tone="violet" />
    <Orb size={1.2} style={at(0.6, 2.4)} tone="rose" />
  </Frame>
);

/** B: the sprout growing inside a glass orb, like a terrarium, with its label below. */
export const PensionB: FC = () => (
  <Frame
    h={15.5}
    label={`A sprout growing inside a glass orb, labelled pension, ${FIG.pension}, example.`}
    scene="pension-b"
  >
    <Orb size={11} style={at(5.5, 0.4)} tone="teal">
      <span className="p11-r5-soil" />
      <Sprout
        style={{
          position: "absolute",
          left: "3.3em",
          top: "2.4em",
          width: "4.4em",
          height: "4.9em",
        }}
      />
    </Orb>
    <Card className="p11-r5-chip-card" style={at(2.2, 11.4, 17.6)}>
      <span className="p11-r5-small">Pension</span>
      <span className="p11-r5-fig p11-r5-fig--sm tabular-nums">{FIG.pension}</span>
      <Example />
    </Card>
    <Orb size={2.6} style={at(17.6, 2)} tone="violet" />
    <Orb size={1.6} style={at(1.8, 5.6)} tone="sky" />
    <Orb size={1.1} style={at(3.4, 2.2)} tone="rose" />
  </Frame>
);

/* =============================================================================================
 * onboarding: three rising steps with a sprout.
 * =========================================================================================== */

const ON_STEPS: { label: string; tone: Tone }[] = [
  { label: "Rough figures", tone: "sky" },
  { label: "Your picture", tone: "violet" },
  { label: "Check in", tone: "teal" },
];
const onboardingLabel =
  "Three rising steps: rough figures, your picture, check in. A sprout grows on the tallest.";

/** A: three glass blocks rising, a numbered orb on each, the sprout on the tallest. */
export const OnboardingA: FC = () => (
  <Frame h={15.5} label={onboardingLabel} scene="onboarding-a">
    {ON_STEPS.map((step, i) => {
      const h = 4.4 + i * 2.6;
      return (
        <span
          className="p11-r5-stepcol"
          key={step.label}
          style={at(0.4 + i * 7.2, 15 - h - 2.4, 6.8)}
        >
          <Orb size={2.2} style={{ position: "relative" }} tone={step.tone}>
            <span className="p11-r5-orb-text tabular-nums">{i + 1}</span>
          </Orb>
          <Glass className="p11-r5-block" style={{ height: `${h}em` }} tone={step.tone}>
            <span className="p11-r5-block-label">{step.label}</span>
          </Glass>
        </span>
      );
    })}
    <Sprout style={at(18.6, 0.2, 3.2, 3.5)} />
  </Frame>
);

/** B: three orbs rising along a dotted path, as on the journey. */
export const OnboardingB: FC = () => {
  const orbs = [
    { size: 3.2, l: 1.4, t: 8.6 },
    { size: 4.2, l: 8.4, t: 5.2 },
    { size: 5.2, l: 15.4, t: 1.4 },
  ];
  return (
    <Frame h={15.5} label={onboardingLabel} scene="onboarding-b">
      <Dots d="M50 96C62 89 72 83 84 79M130 66C139 60 146 55 152 52" h={15.5} />
      {ON_STEPS.map((step, i) => {
        const o = orbs[i] ?? { size: 3, l: 0, t: 0 };
        return (
          <span className="p11-r5-orbstep" key={step.label} style={at(o.l - 1, o.t, o.size + 2)}>
            <Orb size={o.size} style={{ position: "relative" }} tone={step.tone}>
              <span className="p11-r5-orb-text p11-r5-orb-text--lg tabular-nums">{i + 1}</span>
            </Orb>
            <span className="p11-r5-label p11-r5-label--strong">{step.label}</span>
          </span>
        );
      })}
      <Orb size={1.1} style={at(9.4, 12.6)} tone="rose" />
    </Frame>
  );
};

/* =============================================================================================
 * not-found: a signpost that points two ways.
 * =========================================================================================== */

const notFoundLabel = "A signpost pointing two ways: to the home page and to Flump features.";

/** A: a glass signpost, two arrow boards, an orb on top. */
export const NotFoundA: FC = () => (
  <Frame h={15} label={notFoundLabel} scene="notfound-a">
    <span className="p11-r5-ground" style={at(4, 13.4, 14, 1.2)} />
    <Glass className="p11-r5-post" style={at(10.3, 2.4, 1.4, 11.6)} tone="sky" />
    <Orb size={2.4} style={at(9.8, 0.4)} tone="rose" />
    <Glass className="p11-r5-board p11-r5-board--right" style={at(10.6, 3.6, 10.6, 3)} tone="teal">
      <span>Home page</span>
    </Glass>
    <Glass className="p11-r5-board p11-r5-board--left" style={at(0.6, 7.6, 11.6, 3)} tone="violet">
      <span>Flump features</span>
    </Glass>
  </Frame>
);

/** B: a compass orb, with the two ways out on either side. */
export const NotFoundB: FC = () => (
  <Frame
    h={15}
    label={`A compass in a glass orb, ${notFoundLabel.charAt(0).toLowerCase()}${notFoundLabel.slice(1)}`}
    scene="notfound-b"
  >
    <Orb size={10.4} style={at(5.8, 0.4)} tone="violet">
      <span className="p11-r5-ticks" />
      <span className="p11-r5-needle" />
    </Orb>
    <Card className="p11-r5-way" style={at(0.4, 11.6)}>
      <ArrowLeft aria-hidden="true" className="p11-r5-way__icon" />
      Flump features
    </Card>
    <Card className="p11-r5-way" style={at(12.6, 11.6)}>
      Home page
      <ArrowRight aria-hidden="true" className="p11-r5-way__icon" />
    </Card>
    <Orb size={1.8} style={at(18.6, 2.4)} tone="sky" />
    <Orb size={1.2} style={at(2.6, 4)} tone="teal" />
  </Frame>
);

/* =============================================================================================
 * check-in and check-in-done: a simpler glass calendar.
 * =========================================================================================== */

const CHECK_ROWS = ["Savings", "Pension", "Credit card"];

const Tick: FC<{ size: number; style?: CSSProperties }> = ({ size, style }) => (
  <Orb size={size} style={style} tone="teal">
    <Check aria-hidden="true" className="p11-r5-tick" strokeWidth={2.6} />
  </Orb>
);

/** A: a date tile (26 November) and three short rows, ticked when done. */
const CheckA: FC<{ done?: boolean }> = ({ done }) => (
  <Frame
    h={16.5}
    label={
      done
        ? "Monthly check-in for 26 November, done: savings, pension and credit card updated."
        : "Monthly check-in for 26 November: savings, pension and credit card to update."
    }
    scene={done ? "checkdone-a" : "check-a"}
  >
    <Orb size={2.2} style={at(1, 1)} tone="violet" />
    <Card className="p11-r5-cal" style={at(3, 1.6, 15.6)}>
      <span className="p11-r5-cal__band">
        <span className="p11-r5-cal__ring" />
        <span className="p11-r5-cal__ring" />
      </span>
      <span className="p11-r5-cal__date">
        <span className="p11-r5-cal__day tabular-nums">26</span>
        <span className="p11-r5-title">November</span>
      </span>
      <span className="p11-r5-cal__rows">
        {CHECK_ROWS.map((row) => (
          <span className="p11-r5-cal__row" key={row}>
            <span className={`p11-r5-mark ${done ? "p11-r5-mark--done" : ""}`}>
              {done && <Check aria-hidden="true" strokeWidth={3} />}
            </span>
            <span className="p11-r5-small">{row}</span>
          </span>
        ))}
      </span>
    </Card>
    {done ? (
      <Tick size={4} style={at(16.2, 0.4)} />
    ) : (
      <Orb size={2.8} style={at(17.4, 10.4)} tone="sky" />
    )}
    <Orb size={1.2} style={at(1.4, 13.4)} tone="rose" />
  </Frame>
);

/** B: November as a grid of dots, today a glass orb (with a tick when done). */
const CheckB: FC<{ done?: boolean }> = ({ done }) => (
  <Frame
    h={15}
    label={
      done
        ? "Monthly check-in for 26 November, done."
        : "Monthly check-in, today 26 November marked."
    }
    scene={done ? "checkdone-b" : "check-b"}
  >
    <Card className="p11-r5-dotcal" style={at(1.6, 0.6, 18.8)}>
      <span className="p11-r5-head">
        <span className="p11-r5-title">November</span>
        <span className="p11-r5-small">{done ? "Checked in" : "Check-in day"}</span>
      </span>
      <span aria-hidden="true" className="p11-r5-dotcal__grid">
        {Array.from({ length: 35 }, (_, i) => {
          const day = i - 5;
          if (day < 1 || day > 30) return <i className="p11-r5-dotcal__blank" key={i} />;
          if (day === 26)
            return (
              <i className="p11-r5-dotcal__today" key={i}>
                {done ? <Tick size={2.2} /> : <Orb size={2.2} tone="teal" />}
              </i>
            );
          return <i data-past={day < 26 ? "" : undefined} key={i} />;
        })}
      </span>
    </Card>
    <Orb size={2} style={at(0.4, 11.4)} tone="violet" />
    <Orb size={1.4} style={at(19.4, 0.2)} tone="rose" />
    <Orb size={1.1} style={at(20.2, 12.2)} tone="sky" />
  </Frame>
);

/** C: the month as a ring of twelve beads in a glass orb, this month lit. */
const CheckC: FC<{ done?: boolean }> = ({ done }) => (
  <Frame
    h={15}
    label={
      done
        ? "A ring of twelve months with November checked in."
        : "A ring of twelve months with November, this month, marked for a check-in."
    }
    scene={done ? "checkdone-c" : "check-c"}
  >
    <Orb size={11.6} style={at(5.2, 0.2)} tone="sky">
      {Array.from({ length: 12 }, (_, i) => (
        <span
          className="p11-r5-bead"
          data-now={i === 10 ? "" : undefined}
          data-past={i < 10 ? "" : undefined}
          key={i}
          style={{ "--a": `${i * 30}deg` } as CSSProperties}
        />
      ))}
      <span className="p11-r5-ring-centre">
        {done ? <Check aria-hidden="true" className="p11-r5-ring-tick" strokeWidth={2.6} /> : null}
        <span className="p11-r5-title">{done ? "Done" : "November"}</span>
      </span>
    </Orb>
    <Card className="p11-r5-chip" style={at(13.8, 12.4)}>
      Once a month
    </Card>
    <Orb size={2.2} style={at(1.6, 2.6)} tone="violet" />
    <Orb size={1.2} style={at(3.2, 11.6)} tone="rose" />
  </Frame>
);

export const CheckInA: FC = () => <CheckA />;
export const CheckInB: FC = () => <CheckB />;
export const CheckInC: FC = () => <CheckC />;
export const CheckInDoneA: FC = () => <CheckA done />;
export const CheckInDoneB: FC = () => <CheckB done />;
export const CheckInDoneC: FC = () => <CheckC done />;

/* =============================================================================================
 * The options for the image sheet, by live scene.
 * =========================================================================================== */

export const ROUND5_OPTIONS: Record<string, readonly FC[]> = {
  "empty-goals": [GoalsA, GoalsB],
  "empty-savings": [SavingsA, SavingsB],
  "empty-debt": [DebtA, DebtB],
  "empty-pension": [PensionA, PensionB],
  "check-in": [CheckInA, CheckInB, CheckInC],
  "check-in-done": [CheckInDoneA, CheckInDoneB, CheckInDoneC],
  onboarding: [OnboardingA, OnboardingB],
  "not-found": [NotFoundA, NotFoundB],
};
