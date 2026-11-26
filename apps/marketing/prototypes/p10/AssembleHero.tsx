import {
  BREATHING_ROOM_DESCRIPTION,
  BREATHING_ROOM_LABEL,
  HeroFigure,
  KpiCard,
  StatusBadge,
} from "@repo/ui";
import { type FC, useRef } from "react";
import { heroHeading, heroLead } from "../../src/pages/HomePage/HomePage.styles";
import { usePace } from "../shared/pace";
import { Bubbles } from "../shared/round3";
import { ScrollCue } from "../shared/SectionNav";
import { useGsap } from "../shared/useGsap";
import { LitCtas } from "./LitCtas";
import { Piece } from "./Pieces";
import { FIG, SOURCES } from "./pieceData";

/** A tile's figure, plus the empty slot line shown before its pieces have arrived. */
const Value: FC<{ k: string; text: string }> = ({ k, text }) => (
  <span className="p10-value">
    <span className="p10-value__text tabular-nums" data-p10-value={k}>
      {text}
    </span>
    <span aria-hidden="true" className="p10-value__slot" data-p10-slot={k} />
  </span>
);

/**
 * The finished picture: the dashboard's own HeroFigure and KpiCards, then the rows it is made
 * from. This is the server-rendered and reduced-motion hero, with every piece's figures in it.
 */
const Dashboard: FC = () => (
  <figure aria-labelledby="p10-dash-title p10-dash-badge" className="p10-dash">
    <div className="p10-dash__head">
      <h2 className="p10-dash__title" id="p10-dash-title">
        Monthly picture
      </h2>
      <StatusBadge id="p10-dash-badge" size="sm" variant="neutral">
        Example
      </StatusBadge>
    </div>
    <div className="p10-dash__tiles">
      <HeroFigure
        className="p10-dash__hero"
        id="p10-net-worth"
        label="Net worth"
        value={<Value k="net" text={FIG.netWorth} />}
      />
      {FIG.leftOverMonthly && (
        <KpiCard
          label="Left over each month"
          value={<Value k="left" text={FIG.leftOverMonthly} />}
        />
      )}
      {FIG.breathingRoom && (
        <KpiCard
          label={BREATHING_ROOM_LABEL}
          explain={BREATHING_ROOM_DESCRIPTION}
          value={<Value k="room" text={FIG.breathingRoom} />}
        />
      )}
    </div>
    <div className="p10-made">
      <h3 className="p10-made__title">Made from</h3>
      <ul className="p10-made__list">
        {SOURCES.map((source) => (
          <li className="p10-made__row" data-p10-row={source.key} key={source.key}>
            <span aria-hidden="true" className="p10-made__bar" />
            <span
              aria-hidden="true"
              className={`p10-glyph p10-glyph--${source.key}`}
              data-p10-glyph={source.key}
            />
            <span className="p10-made__text">
              <span className="p10-made__name">{source.name}</span>
              <span className="p10-made__detail tabular-nums">{source.detail}</span>
            </span>
            <span className="p10-made__figure tabular-nums">{source.figure}</span>
          </li>
        ))}
      </ul>
    </div>
    <figcaption className="p10-dash__caption tabular-nums">
      Example household. Net worth also counts a {FIG.home} home estimate and a {FIG.loan} loan.
    </figcaption>
    <span aria-hidden="true" className="p10-dash__glint" />
  </figure>
);

/**
 * Prototype 4's hero, copied and slowed for prototype 10: the picture assembles. Separate pieces of a household's money float in
 * depth and, as the reader scrolls, fly together into the one dashboard (assembleTimeline.ts).
 */
export const AssembleHero: FC = () => {
  const ref = useRef<HTMLElement>(null);
  const pace = usePace();
  useGsap(
    ref,
    (kit, root) => {
      let undo: (() => void) | undefined;
      let cancelled = false;
      import("./assembleTimeline").then(({ buildAssemble }) => {
        if (!cancelled) undo = buildAssemble(kit, root, pace);
      });
      return () => {
        cancelled = true;
        undo?.();
      };
    },
    [pace.pace],
  );

  return (
    <section
      aria-labelledby="home-title"
      className="p10-hero"
      data-proto-name="One picture"
      data-proto-section=""
      ref={ref}
    >
      <Bubbles layout="a" />
      <div className="p10-hero__inner">
        <div className="p10-hero__copy">
          <h1 className={`${heroHeading()} p10-hero__title`} id="home-title">
            All your money. One clear picture.
          </h1>
          <p className={`${heroLead()} p10-hero__lead`}>
            Accounts, budget, pay, savings, pension and debts in one place.
          </p>
          <LitCtas />
          <div className="p10-hero__cue">
            <ScrollCue href="#journey" label="See how it comes together" />
          </div>
        </div>
        <div className="p10-stage">
          <div className="p10-scene">
            <Dashboard />
            <div aria-hidden="true" className="p10-pieces">
              {SOURCES.map((source) => (
                <Piece k={source.key} key={source.key} />
              ))}
              <span className="p10-ghost tabular-nums">{FIG.leftOver}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
