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
import { ScrollCue } from "../shared/SectionNav";
import { useGsap } from "../shared/useGsap";
import { HeroCtas } from "./HeroCtas";
import { Piece } from "./Pieces";
import { FIG, SOURCES } from "./pieceData";

/** A tile's figure, plus the empty slot line shown before its pieces have arrived. */
const Value: FC<{ k: string; text: string }> = ({ k, text }) => (
  <span className="p8-value">
    <span className="p8-value__text tabular-nums" data-p8-value={k}>
      {text}
    </span>
    <span aria-hidden="true" className="p8-value__slot" data-p8-slot={k} />
  </span>
);

/**
 * The finished picture: the dashboard's own HeroFigure and KpiCards, then the rows it is made
 * from. This is the server-rendered and reduced-motion hero, with every piece's figures in it.
 */
const Dashboard: FC = () => (
  <figure aria-labelledby="p8-dash-title p8-dash-badge" className="p8-dash">
    <div className="p8-dash__head">
      <h2 className="p8-dash__title" id="p8-dash-title">
        Monthly picture
      </h2>
      <StatusBadge id="p8-dash-badge" size="sm" variant="neutral">
        Example
      </StatusBadge>
    </div>
    <div className="p8-dash__tiles">
      <HeroFigure
        className="p8-dash__hero"
        id="p8-net-worth"
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
    <div className="p8-made">
      <h3 className="p8-made__title">Made from</h3>
      <ul className="p8-made__list">
        {SOURCES.map((source) => (
          <li className="p8-made__row" data-p8-row={source.key} key={source.key}>
            <span aria-hidden="true" className="p8-made__bar" />
            <span
              aria-hidden="true"
              className={`p8-glyph p8-glyph--${source.key}`}
              data-p8-glyph={source.key}
            />
            <span className="p8-made__text">
              <span className="p8-made__name">{source.name}</span>
              <span className="p8-made__detail tabular-nums">{source.detail}</span>
            </span>
            <span className="p8-made__figure tabular-nums">{source.figure}</span>
          </li>
        ))}
      </ul>
    </div>
    <figcaption className="p8-dash__caption tabular-nums">
      Example household. Net worth also counts a {FIG.home} home estimate and a {FIG.loan} loan.
    </figcaption>
    <span aria-hidden="true" className="p8-dash__glint" />
  </figure>
);

/**
 * Prototype 8's hero (prototype 4's, slowed): separate pieces of a household's money float in
 * shallow depth and, as the reader scrolls, travel together into the one dashboard
 * (assembleTimeline.ts). Every duration and the pin's length come from the pace tokens.
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
      className="p8-hero"
      data-proto-name="One picture"
      data-proto-section=""
      ref={ref}
    >
      <div className="p8-hero__inner">
        <div className="p8-hero__copy">
          <h1 className={`${heroHeading()} p8-hero__title`} id="home-title">
            All your money. One clear picture.
          </h1>
          <p className={`${heroLead()} p8-hero__lead`}>
            Accounts, budget, pay, savings, pension and debts in one place.
          </p>
          <HeroCtas />
          <div className="p8-hero__cue">
            <ScrollCue href="#areas" label="See the five areas" />
          </div>
        </div>
        <div className="p8-stage">
          <div className="p8-scene">
            <Dashboard />
            <div aria-hidden="true" className="p8-pieces">
              {SOURCES.map((source) => (
                <Piece k={source.key} key={source.key} />
              ))}
              <span className="p8-ghost tabular-nums">{FIG.leftOver}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
