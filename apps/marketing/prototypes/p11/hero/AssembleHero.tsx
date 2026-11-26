import {
  BREATHING_ROOM_DESCRIPTION,
  BREATHING_ROOM_LABEL,
  HeroFigure,
  KpiCard,
  StatusBadge,
} from "@repo/ui";
import { type FC, useRef } from "react";
import { heroHeading, heroLead } from "../../../src/pages/HomePage/HomePage.styles";
import { usePace } from "../../shared/pace";
import { Bubbles } from "../../shared/round3";
import { ScrollCue } from "../../shared/SectionNav";
import { useGsap } from "../../shared/useGsap";
import { LitCtas } from "./LitCtas";
import { Piece } from "./Pieces";
import { FIG, SOURCES } from "./pieceData";

/** A tile's figure, plus the empty slot line shown before its pieces have arrived. */
const Value: FC<{ k: string; text: string }> = ({ k, text }) => (
  <span className="p11-value">
    <span className="p11-value__text tabular-nums" data-p11-value={k}>
      {text}
    </span>
    <span aria-hidden="true" className="p11-value__slot" data-p11-slot={k} />
  </span>
);

/**
 * The finished picture: the dashboard's own HeroFigure and KpiCards, then the rows it is made
 * from. This is the server-rendered and reduced-motion hero, with every piece's figures in it.
 */
const Dashboard: FC = () => (
  <figure aria-labelledby="p11-dash-title p11-dash-badge" className="p11-dash">
    <div className="p11-dash__head">
      <h2 className="p11-dash__title" id="p11-dash-title">
        Monthly picture
      </h2>
      <StatusBadge id="p11-dash-badge" size="sm" variant="neutral">
        Example
      </StatusBadge>
    </div>
    <div className="p11-dash__tiles">
      <HeroFigure
        className="p11-dash__hero"
        id="p11-net-worth"
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
    <div className="p11-made">
      <h3 className="p11-made__title">Made from</h3>
      <ul className="p11-made__list">
        {SOURCES.map((source) => (
          <li className="p11-made__row" data-p11-row={source.key} key={source.key}>
            <span aria-hidden="true" className="p11-made__bar" />
            <span
              aria-hidden="true"
              className={`p11-glyph p11-glyph--${source.key}`}
              data-p11-glyph={source.key}
            />
            <span className="p11-made__text">
              <span className="p11-made__name">{source.name}</span>
              <span className="p11-made__detail tabular-nums">{source.detail}</span>
            </span>
            <span className="p11-made__figure tabular-nums">{source.figure}</span>
          </li>
        ))}
      </ul>
    </div>
    <figcaption className="p11-dash__caption tabular-nums">
      Example household. Net worth also counts a {FIG.home} home estimate and a {FIG.loan} loan.
    </figcaption>
    <span aria-hidden="true" className="p11-dash__glint" />
  </figure>
);

/**
 * Prototype 4's hero, copied and slowed for prototype 10 (and copied again for 11): the picture assembles. Separate pieces of a household's money float in
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
      className="p11-hero"
      data-proto-name="One picture"
      data-proto-section=""
      ref={ref}
    >
      <Bubbles layout="a" />
      <div className="p11-hero__inner">
        <div className="p11-hero__copy">
          <h1 className={`${heroHeading()} p11-hero__title`} id="home-title">
            All your money. One clear picture.
          </h1>
          <p className={`${heroLead()} p11-hero__lead`}>
            Accounts, budget, pay, savings, pension and debts in one place.
          </p>
          <LitCtas />
          <div className="p11-hero__cue">
            <ScrollCue href="#features" label="See the five areas" />
          </div>
        </div>
        <div className="p11-stage">
          <div className="p11-scene">
            <Dashboard />
            <div aria-hidden="true" className="p11-pieces">
              {SOURCES.map((source) => (
                <Piece k={source.key} key={source.key} />
              ))}
              <span className="p11-ghost tabular-nums">{FIG.leftOver}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
