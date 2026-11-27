import { type FC, useId } from "react";
import { formatGbp, SAMPLE_BUDGET, SAMPLE_HOME } from "../JourneySample/journeySamples";
import {
  paper,
  perforation,
  picture,
  ruling,
  sheenFrom,
  sheenTo,
  stepLabel,
  stepNote,
  stepNumber,
  tagPill,
  tagText,
  ticket,
  title,
} from "./GettingStartedTicket.styles";

/** The three steps, in the sample household's figures (the home journey's, MK13). */
export const TICKET_STEPS = [
  { label: ["Rough", "figures"], note: [`${formatGbp(SAMPLE_BUDGET.comesIn)} in`] },
  { label: ["Your", "picture"], note: [formatGbp(SAMPLE_HOME.netWorth), "net worth"] },
  { label: ["Check in"], note: ["Once a", "month"] },
] as const;

/*
 * Geometry, in user units (16 a prototype em). The ticket: 0.6em in, 1.6em down, 20.8em wide,
 * turned 2 degrees back about its middle. Inside: 1em above, 1.2em at the sides and below; the
 * head, then three equal columns with dashed perforations between, each column's lines centred.
 */
const X = 9.6;
const Y = 25.6;
const W = 332.8;
const H = 181;
const INNER = { left: X + 19.2, right: X + W - 19.2 };
const COLUMN = (INNER.right - INNER.left) / 3;
const centreOf = (i: number) => {
  const start = INNER.left + i * COLUMN + (i === 0 ? 0 : 11.2);
  const end = INNER.left + (i + 1) * COLUMN - 11.2;
  return (start + end) / 2;
};
const LABEL_TOP = 121;
const LINE = { label: 19.2, note: 17 };

/**
 * The "Getting started" ticket in the close of the features, area and AI connection pages,
 * prototype 11's own picture (owner, 27 Nov 2026: "it should match"): ruled paper turned a little,
 * its title and an "Example" tag, and three steps in perforated parts, each centred. Decorative:
 * the close's words say the same, so it is hidden from assistive technology.
 */
export const GettingStartedTicket: FC = () => {
  const id = useId();
  const ruled = `${id}-ruled`;
  const sheen = `${id}-sheen`;
  return (
    <svg
      aria-hidden="true"
      className={picture}
      data-testid="getting-started-ticket"
      focusable="false"
      viewBox="0 0 352 224"
    >
      <defs>
        <pattern height="4" id={ruled} patternUnits="userSpaceOnUse" width="4">
          <rect className={ruling} height="1" width="4" />
        </pattern>
        <linearGradient id={sheen} x1="0" x2="1" y1="0" y2="1">
          <stop className={sheenFrom} offset="0.2" />
          <stop className={sheenTo} offset="1" />
        </linearGradient>
      </defs>
      <g className={ticket} transform={`rotate(-2 ${X + W / 2} ${Y + H / 2})`}>
        <rect className={paper} height={H} rx="8" width={W} x={X} y={Y} />
        <rect fill={`url(#${ruled})`} height={H} rx="8" width={W} x={X} y={Y} />
        <rect fill={`url(#${sheen})`} height={H} rx="8" width={W} x={X} y={Y} />
        <text className={title} x={INNER.left} y="55">
          Getting started
        </text>
        <rect className={tagPill} height="21" rx="10.5" width="70" x={INNER.right - 70} y="38" />
        <text className={tagText} textAnchor="middle" x={INNER.right - 35} y="53">
          Example
        </text>
        {[1, 2].map((i) => {
          const x = INNER.left + i * COLUMN;
          return <line className={perforation} key={i} x1={x} x2={x} y1="75" y2="188" />;
        })}
        {TICKET_STEPS.map((step, i) => {
          const x = centreOf(i);
          const noteTop = LABEL_TOP + (step.label.length - 1) * LINE.label + 22;
          return (
            <g key={step.label.join(" ")} textAnchor="middle">
              <text className={stepNumber} x={x} y="99">
                {i + 1}
              </text>
              {step.label.map((line, n) => (
                <text className={stepLabel} key={line} x={x} y={LABEL_TOP + n * LINE.label}>
                  {line}
                </text>
              ))}
              {step.note.map((line, n) => (
                <text className={stepNote} key={line} x={x} y={noteTop + n * LINE.note}>
                  {line}
                </text>
              ))}
            </g>
          );
        })}
      </g>
    </svg>
  );
};
