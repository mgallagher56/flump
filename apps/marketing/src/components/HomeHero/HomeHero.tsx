import {
  BREATHING_ROOM_DESCRIPTION,
  BREATHING_ROOM_LABEL,
  ExampleTag,
  HeroFigure,
  KpiCard,
} from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { ChevronDown } from "lucide-react";
import { type FC, useEffect, useRef, useState } from "react";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { BubbleField } from "../BubbleField";
import { LitCtas } from "../LitCtas";
import {
  card,
  cardChip,
  cardEdge,
  cardFace,
  cardFigure,
  cardMeta,
  cardName,
  cardSheen,
  cardTag,
  cardTone,
  cardTop,
  cardWave,
  dash,
  dashCaption,
  dashHead,
  dashHeroTile,
  dashTiles,
  dashTitle,
  ghost,
  glint,
  glintClip,
  glyph,
  hero,
  heroAside,
  heroCopy,
  heroHeading,
  heroInner,
  heroLead,
  letterhead,
  letterheadLines,
  letterheadMark,
  made,
  madeBar,
  madeDetail,
  madeFigure,
  madeList,
  madeName,
  madeRow,
  madeText,
  madeTitle,
  paper,
  paperHead,
  paperTitle,
  piece,
  pieceRows,
  pieceRowTotal,
  piecesLayer,
  scene,
  scrollCue,
  stage,
  value,
  valueSlot,
  valueText,
} from "./HomeHero.styles";
import { HERO_FIGURES as FIG, HERO_SOURCES, type PieceKey } from "./heroData";

/** A dashboard figure, with the empty line it rests on before its pieces arrive (hidden at rest). */
const Value: FC<{ k: "net" | "left" | "room"; text: string }> = ({ k, text }) => (
  <span className={value}>
    <span className={valueText} data-hero-value={k}>
      {text}
    </span>
    <span aria-hidden="true" className={valueSlot} data-hero-slot={k} />
  </span>
);

const GLYPH_KIND: Record<PieceKey, "card" | "document" | "receipt" | "statement"> = {
  card: "card",
  credit: "card",
  payslip: "document",
  receipt: "receipt",
  statement: "statement",
  pension: "statement",
};

const glyphClass = (k: PieceKey) =>
  cx(
    glyph({ kind: GLYPH_KIND[k] }),
    k === "card" ? cardTone({ tone: "savings" }) : undefined,
    k === "credit" ? cardTone({ tone: "credit" }) : undefined,
  );

/**
 * The finished picture: the dashboard's own HeroFigure and KpiCards, then the rows it is made from.
 * This is the server render, the no-JavaScript and the reduced-motion hero, and the accessible
 * name and every figure are always here; the pieces only ever play over it.
 */
const Dashboard: FC = () => (
  <figure aria-labelledby="home-dash-title home-dash-tag" className={dash} data-hero-dash="">
    <div className={dashHead}>
      <h2 className={dashTitle} id="home-dash-title">
        Monthly picture
      </h2>
      <ExampleTag id="home-dash-tag" />
    </div>
    <div className={dashTiles}>
      <HeroFigure
        className={dashHeroTile}
        id="home-net-worth"
        label="Net worth"
        value={<Value k="net" text={FIG.netWorth} />}
      />
      {FIG.leftOverMonthly !== null && (
        <KpiCard
          label="Left over each month"
          value={<Value k="left" text={FIG.leftOverMonthly} />}
        />
      )}
      {FIG.breathingRoom !== null && (
        <KpiCard
          explain={BREATHING_ROOM_DESCRIPTION}
          label={BREATHING_ROOM_LABEL}
          value={<Value k="room" text={FIG.breathingRoom} />}
        />
      )}
    </div>
    <div className={made}>
      <h3 className={madeTitle}>Made from</h3>
      <ul className={madeList} data-hero-list="">
        {HERO_SOURCES.map((source) => (
          <li className={madeRow} data-hero-row={source.key} key={source.key}>
            <span aria-hidden="true" className={madeBar} data-hero-bar="" />
            <span
              aria-hidden="true"
              className={glyphClass(source.key)}
              data-hero-glyph={source.key}
            />
            <span className={madeText}>
              <span className={madeName}>{source.name}</span>
              <span className={madeDetail}>{source.detail}</span>
            </span>
            <span className={madeFigure}>{source.figure}</span>
          </li>
        ))}
      </ul>
    </div>
    <figcaption className={dashCaption}>
      Example household. Net worth also counts a {FIG.home} home estimate and a {FIG.loan} loan.
    </figcaption>
    {/* The lock: one sweep of light across the finished frame (prototype 11's glint). */}
    <span aria-hidden="true" className={glintClip}>
      <span className={glint} data-hero-glint="" />
    </span>
  </figure>
);

/*
 * The six pieces of the household's money, as document cards built from tokens (F3 has no such
 * pictures): a savings card, a payslip, a till receipt, a mortgage statement, a pension statement
 * and a credit card. Decorative copies of the "Made from" rows, inside an aria-hidden layer.
 */

const CardPiece: FC<{
  tone: "savings" | "credit";
  name: string;
  figure: string;
  meta: string;
}> = ({ tone, name, figure, meta }) => (
  <div className={cx(card, cardTone({ tone }))}>
    <div className={cardEdge} />
    <div className={cardFace}>
      <div className={cardTop}>
        <span className={cardName}>{name}</span>
        <span className={cardTag}>Example</span>
      </div>
      <span className={tone === "savings" ? cardChip : cardWave} />
      <span className={cardFigure}>{figure}</span>
      <span className={cardMeta}>{meta}</span>
      <span className={cardSheen} />
    </div>
  </div>
);

type Row = readonly [label: string, figure: string];

const PieceRows: FC<{ rows: readonly Row[]; total: number; from?: "left" }> = ({
  rows,
  total,
  from,
}) => (
  <dl className={pieceRows}>
    {rows.map(([label, figure], index) => (
      <div className={index === total ? pieceRowTotal : undefined} key={label}>
        <dt>{label}</dt>
        {/* The receipt's total is where the "left over" figure lifts off (`data-hero-from`). */}
        <dd data-hero-from={index === total ? from : undefined}>{figure}</dd>
      </div>
    ))}
  </dl>
);

const PaperPiece: FC<{ kind: "payslip" | "receipt"; title: string; rows: readonly Row[] }> = ({
  kind,
  title,
  rows,
}) => (
  <div className={paper({ kind })}>
    <div className={paperHead}>
      <span className={paperTitle}>{title}</span>
      <ExampleTag />
    </div>
    <PieceRows from={kind === "receipt" ? "left" : undefined} rows={rows} total={rows.length - 1} />
  </div>
);

const StatementPiece: FC<{ title: string; rows: readonly Row[] }> = ({ title, rows }) => (
  <div className={paper({ kind: "statement" })}>
    <div className={letterhead}>
      <span className={letterheadMark} />
      <span className={letterheadLines}>
        <i />
        <i />
      </span>
      <ExampleTag />
    </div>
    <span className={paperTitle}>{title}</span>
    <PieceRows rows={rows} total={0} />
  </div>
);

const PIECES: Record<PieceKey, FC> = {
  card: () => (
    <CardPiece figure={FIG.savings} meta={FIG.savingsRate} name="Cash and savings" tone="savings" />
  ),
  payslip: () => (
    <PaperPiece
      kind="payslip"
      rows={[
        ["Salary a year", FIG.salary],
        ["Gross this month", FIG.grossMonthly],
        ["Net pay", FIG.netMonthly],
      ]}
      title="Payslip"
    />
  ),
  receipt: () => (
    <PaperPiece
      kind="receipt"
      rows={[
        ["Comes in", FIG.comesIn],
        ["Goes out", FIG.goesOut],
        ["Left over", FIG.leftOver],
      ]}
      title="This month"
    />
  ),
  statement: () => (
    <StatementPiece
      rows={[
        ["Balance", FIG.mortgage],
        ["Rate", FIG.mortgageRate],
        ["Fixed until", FIG.fixedUntil],
      ]}
      title="Mortgage statement"
    />
  ),
  pension: () => (
    <StatementPiece
      rows={[
        ["Pot value", FIG.pension],
        ["Kind", "Workplace and personal"],
      ]}
      title="Pension statement"
    />
  ),
  credit: () => (
    <CardPiece
      figure={FIG.card}
      meta={`${FIG.cardRate}, ${FIG.cardMonthly} a month`}
      name="Credit card"
      tone="credit"
    />
  ),
};

/**
 * The cue to the five areas (prototype 11's `ScrollCue`): it fades out once the page has scrolled
 * more than 60px, and back at the top. Keyboard focus shows it again. The server HTML shows it.
 */
const ScrollCue: FC = () => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 60);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <a
      className={scrollCue}
      data-scrolled={scrolled}
      data-testid="hero-scroll-cue"
      href="#features"
    >
      <span>See the five areas</span>
      <ChevronDown aria-hidden="true" size={20} />
    </a>
  );
};

/** The two ways the assembly can play; the owner compares them with `?hero=timed`. */
export type HeroMode = "scroll" | "timed";

/** Reads the mode from the address on the client: `?hero=timed`, otherwise prototype 11's scroll. */
export function heroModeFrom(search: string): HeroMode {
  return new URLSearchParams(search).get("hero") === "timed" ? "timed" : "scroll";
}

/**
 * The home hero (ROLLOUT-PLAN M1, from prototype 11): the decided headline and lead, the two calls
 * to action and a cue to the five areas, then the "Monthly picture" dashboard. Under 1024px one
 * centred column; from 1024px the copy on the left beside the dashboard.
 *
 * Once GSAP has loaded after first paint, six pieces of a household's money float apart and fly
 * into the dashboard's "Made from" rows. By default this is prototype 11's version (`heroScroll.ts`):
 * from 1024px the hero pins and the picture follows the scroll; under 1024px scroll triggers it and
 * time completes it. With `?hero=timed` in the address (read on the client after mount) it is the
 * earlier timed version (`heroAssembly.ts`): played once by time, never pinned or scrubbed. The
 * server HTML, no JavaScript and reduced motion all show the finished, still dashboard, and GSAP
 * never loads under reduced motion.
 */
export const HomeHero: FC = () => {
  const ref = useRef<HTMLElement>(null);

  useGsapMoment(ref, (kit, root) => {
    let finish: (() => void) | undefined;
    let cancelled = false;
    const arm =
      heroModeFrom(window.location.search) === "timed"
        ? import("./heroAssembly").then((m) => m.armHeroAssembly)
        : import("./heroScroll").then((m) => m.armHeroScroll);
    arm.then((start) => {
      if (!cancelled) finish = start(kit, root);
    });
    return () => {
      cancelled = true;
      finish?.();
    };
  });

  return (
    <section
      aria-labelledby="home-title"
      className={hero}
      data-home-section=""
      data-home-section-name="One picture"
      data-testid="home-hero"
      id="home-hero"
      ref={ref}
    >
      <BubbleField fit="hero" layout="a" />
      <div className={heroInner} data-hero-inner="">
        <div className={heroCopy}>
          <h1 className={heroHeading} id="home-title">
            All your money. One clear picture.
          </h1>
          <p className={heroLead}>
            Accounts, budget, pay, savings, pension and debts in one place.
          </p>
          <LitCtas />
          <div className={heroAside}>
            <ScrollCue />
          </div>
        </div>
        <div className={stage} data-hero-stage="">
          <div className={scene}>
            <Dashboard />
            <div aria-hidden="true" className={piecesLayer} data-hero-layer="">
              {HERO_SOURCES.map(({ key }) => {
                const Body = PIECES[key];
                return (
                  <div className={piece} data-hero-piece={key} key={key}>
                    <Body />
                  </div>
                );
              })}
              {/* The receipt's "left over" figure, which lifts off into the dashboard's tile. */}
              <span className={ghost} data-hero-ghost="">
                {FIG.leftOver}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
