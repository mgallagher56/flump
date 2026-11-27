import {
  BREATHING_ROOM_DESCRIPTION,
  BREATHING_ROOM_LABEL,
  Button,
  ExampleTag,
  HeroFigure,
  KpiCard,
} from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { ChevronDown } from "lucide-react";
import { type FC, useRef } from "react";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { signupCta } from "../../utils/site";
import { BubbleField } from "../BubbleField";
import { MotionControl } from "../MotionControl";
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
  ctaRow,
  dash,
  dashCaption,
  dashHead,
  dashHeroTile,
  dashTiles,
  dashTitle,
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
  <figure aria-labelledby="home-dash-title home-dash-tag" className={dash}>
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
      <ul className={madeList}>
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

const PieceRows: FC<{ rows: readonly Row[]; total: number }> = ({ rows, total }) => (
  <dl className={pieceRows}>
    {rows.map(([label, figure], index) => (
      <div className={index === total ? pieceRowTotal : undefined} key={label}>
        <dt>{label}</dt>
        <dd>{figure}</dd>
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
    <PieceRows rows={rows} total={rows.length - 1} />
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
 * The home hero (ROLLOUT-PLAN M1, from prototype 11): the decided headline and lead, the two calls
 * to action, the motion control and a cue to the five areas, then the "Monthly picture" dashboard,
 * all in one centred column at every width. Once GSAP has loaded after first paint and the
 * dashboard is in view, six pieces of a household's money fly into its "Made from" rows by time,
 * never by scroll (`heroAssembly.ts`). The server HTML, no JavaScript and reduced motion all show
 * the finished, still dashboard, and GSAP never loads under reduced motion.
 */
export const HomeHero: FC = () => {
  const ref = useRef<HTMLElement>(null);
  const cta = signupCta();

  useGsapMoment(ref, (kit, root) => {
    let finish: (() => void) | undefined;
    let cancelled = false;
    import("./heroAssembly").then(({ armHeroAssembly }) => {
      if (!cancelled) finish = armHeroAssembly(kit, root);
    });
    return () => {
      cancelled = true;
      finish?.();
    };
  });

  return (
    <section aria-labelledby="home-title" className={hero} data-testid="home-hero" ref={ref}>
      <BubbleField layout="a" />
      <div className={heroInner}>
        <div className={heroCopy}>
          <h1 className={heroHeading} id="home-title">
            All your money. One clear picture.
          </h1>
          <p className={heroLead}>
            Accounts, budget, pay, savings, pension and debts in one place.
          </p>
          <div className={ctaRow}>
            <Button asChild size="lg" variant="primary">
              <a href={cta.href}>{cta.label}</a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="/preview">Interactive preview</a>
            </Button>
          </div>
          <div className={heroAside}>
            <MotionControl />
            <a className={scrollCue} href="#features">
              <span>See the five areas</span>
              <ChevronDown aria-hidden="true" size={20} />
            </a>
          </div>
        </div>
        <div className={stage} data-hero-stage="">
          <div className={scene}>
            <Dashboard />
            <div aria-hidden="true" className={piecesLayer}>
              {HERO_SOURCES.map(({ key }) => {
                const Body = PIECES[key];
                return (
                  <div className={piece} data-hero-piece={key} key={key}>
                    <Body />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
