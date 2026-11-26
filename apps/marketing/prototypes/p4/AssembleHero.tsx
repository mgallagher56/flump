import {
  BREATHING_ROOM_DESCRIPTION,
  BREATHING_ROOM_LABEL,
  HeroFigure,
  KpiCard,
  StatusBadge,
} from "@repo/ui";
import { type FC, useRef } from "react";
import { heroHeading, heroLead } from "../../src/pages/HomePage/HomePage.styles";
import { ScrollCue } from "../shared/SectionNav";
import { HeroCtas } from "../shared/sections";
import { useGsap } from "../shared/useGsap";
import { Piece } from "./Pieces";
import { FIG, SOURCES } from "./pieceData";

/** A tile's figure, plus the empty slot line shown before its pieces have arrived. */
const Value: FC<{ k: string; text: string }> = ({ k, text }) => (
  <span className="p4-value">
    <span className="p4-value__text tabular-nums" data-p4-value={k}>
      {text}
    </span>
    <span aria-hidden="true" className="p4-value__slot" data-p4-slot={k} />
  </span>
);

/**
 * The finished picture: the dashboard's own HeroFigure and KpiCards, then the rows it is made
 * from. This is the server-rendered and reduced-motion hero, with every piece's figures in it.
 */
const Dashboard: FC = () => (
  <figure aria-labelledby="p4-dash-title p4-dash-badge" className="p4-dash">
    <div className="p4-dash__head">
      <h2 className="p4-dash__title" id="p4-dash-title">
        Monthly picture
      </h2>
      <StatusBadge id="p4-dash-badge" size="sm" variant="neutral">
        Example
      </StatusBadge>
    </div>
    <div className="p4-dash__tiles">
      <HeroFigure
        className="p4-dash__hero"
        id="p4-net-worth"
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
    <div className="p4-made">
      <h3 className="p4-made__title">Made from</h3>
      <ul className="p4-made__list">
        {SOURCES.map((source) => (
          <li className="p4-made__row" data-p4-row={source.key} key={source.key}>
            <span aria-hidden="true" className="p4-made__bar" />
            <span
              aria-hidden="true"
              className={`p4-glyph p4-glyph--${source.key}`}
              data-p4-glyph={source.key}
            />
            <span className="p4-made__text">
              <span className="p4-made__name">{source.name}</span>
              <span className="p4-made__detail tabular-nums">{source.detail}</span>
            </span>
            <span className="p4-made__figure tabular-nums">{source.figure}</span>
          </li>
        ))}
      </ul>
    </div>
    <figcaption className="p4-dash__caption tabular-nums">
      Example household. Net worth also counts a {FIG.home} home estimate and a {FIG.loan} loan.
    </figcaption>
    <span aria-hidden="true" className="p4-dash__glint" />
  </figure>
);

/**
 * Prototype 4's hero: the picture assembles. Separate pieces of a household's money float in
 * depth and, as the reader scrolls, fly together into the one dashboard (assembleTimeline.ts).
 */
export const AssembleHero: FC = () => {
  const ref = useRef<HTMLElement>(null);
  useGsap(ref, (kit, root) => {
    let undo: (() => void) | undefined;
    let cancelled = false;
    import("./assembleTimeline").then(({ buildAssemble }) => {
      if (!cancelled) undo = buildAssemble(kit, root);
    });
    return () => {
      cancelled = true;
      undo?.();
    };
  });

  return (
    <section
      aria-labelledby="home-title"
      className="p4-hero"
      data-proto-name="One picture"
      data-proto-section=""
      ref={ref}
    >
      <div className="p4-hero__inner">
        <div className="p4-hero__copy">
          <h1 className={`${heroHeading()} p4-hero__title`} id="home-title">
            All your money. One clear picture.
          </h1>
          <p className={`${heroLead()} p4-hero__lead`}>
            Accounts, budget, pay, savings, pension and debts in one place.
          </p>
          <HeroCtas />
          <div className="p4-hero__cue">
            <ScrollCue href="#areas" label="See the five areas" />
          </div>
        </div>
        <div className="p4-stage">
          <div className="p4-scene">
            <Dashboard />
            <div aria-hidden="true" className="p4-pieces">
              {SOURCES.map((source) => (
                <Piece k={source.key} key={source.key} />
              ))}
              <span className="p4-ghost tabular-nums">{FIG.leftOver}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
