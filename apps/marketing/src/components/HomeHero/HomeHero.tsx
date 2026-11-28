import {
  BREATHING_ROOM_DESCRIPTION,
  BREATHING_ROOM_LABEL,
  ExampleTag,
  HeroFigure,
  KpiCard,
  usePrefersReducedMotion,
} from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { ChevronDown } from "lucide-react";
import { type FC, useEffect, useRef, useState } from "react";
import { useStillMotion } from "../../context/StillMotionContext";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { BubbleField } from "../BubbleField";
import { LitCtas } from "../LitCtas";
import { cardTone, MoneyPiece } from "../MoneyPieces";
import {
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
  made,
  madeBar,
  madeDetail,
  madeFigure,
  madeList,
  madeName,
  madeRow,
  madeText,
  madeTitle,
  piece,
  pieceStart,
  piecesLayer,
  scene,
  scrollCue,
  stage,
  value,
  valueSlot,
  valueText,
} from "./HomeHero.styles";
import { HERO_BUBBLE_DENSITY, HERO_BUBBLES } from "./heroBubbles.styles";
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
 * This is the no-JavaScript and the reduced-motion hero; where script runs, the CSS start state
 * holds its rows and figures back until the pieces land. The accessible name and every figure are
 * always in the DOM; the pieces only ever play over it.
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
 * The home hero (ROLLOUT-PLAN M1, from prototype 11): the decided headline and lead, the one call
 * to action ("Interactive preview"; no invite request, owner, 28 Nov 2026) and a cue to the five areas, then the "Monthly picture" dashboard. Under 1024px one
 * centred column; from 1024px the copy on the left beside the dashboard.
 *
 * Once GSAP has loaded after first paint, six pieces of a household's money float apart and fly
 * into the dashboard's "Made from" rows. By default this is prototype 11's version (`heroScroll.ts`):
 * from 1024px the hero pins and the picture follows the scroll; under 1024px scroll triggers it and
 * time completes it. With `?hero=timed` in the address (read on the client after mount) it is the
 * earlier timed version (`heroAssembly.ts`): played once by time, never pinned or scrubbed.
 *
 * Both start from the start state (owner, 28 Nov 2026), which the server HTML already draws in
 * CSS where script runs: the pieces apart over the pushed-back dashboard (`heroStart.ts`). No
 * JavaScript and reduced motion show the finished, still dashboard instead, and GSAP never loads
 * under reduced motion. A still page (a story's rest state) is marked done, so it shows the
 * finished picture too.
 */
export const HomeHero: FC = () => {
  const ref = useRef<HTMLElement>(null);
  const still = useStillMotion();
  // Once reduced motion has applied on this page (the header's Reduce motion, or the system), the
  // hero stays finished even if it goes off again: its moment never replays (useGsapMoment), so
  // without the done flag the CSS start state would hide the figures again.
  const stopped = useRef(false);
  if (usePrefersReducedMotion()) stopped.current = true;

  useGsapMoment(ref, (kit, root) => {
    let finish: (() => void) | undefined;
    let cancelled = false;
    const arm =
      heroModeFrom(window.location.search) === "timed"
        ? import("./heroAssembly").then((m) => m.armHeroAssembly)
        : import("./heroScroll").then((m) => m.armHeroScroll);
    arm.then(
      (start) => {
        if (!cancelled) finish = start(kit, root);
      },
      // The assembly failed to load: show the finished picture rather than the hidden start state.
      () => {
        root.dataset.heroDone = "true";
      },
    );
    return () => {
      cancelled = true;
      finish?.();
    };
  });

  return (
    <section
      aria-labelledby="home-title"
      className={hero}
      data-hero-done={still || stopped.current ? "true" : undefined}
      data-home-section=""
      data-home-section-name="One picture"
      data-testid="home-hero"
      id="home-hero"
      ref={ref}
    >
      <div className={heroInner} data-hero-inner="">
        {/* Inside the column the pin holds, so no bubble moves when the pin is added. */}
        <BubbleField fit="hero" spots={HERO_BUBBLES[HERO_BUBBLE_DENSITY]} />
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
              {HERO_SOURCES.map(({ key }) => (
                <div className={cx(piece, pieceStart[key])} data-hero-piece={key} key={key}>
                  <MoneyPiece k={key} />
                </div>
              ))}
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
