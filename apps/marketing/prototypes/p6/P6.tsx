import { Button } from "@repo/ui";
import { type FC, type ReactNode, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../../src/components/Footer";
import { Header } from "../../src/components/Header";
import { heroHeading, heroLead, mainContent } from "../../src/pages/HomePage/HomePage.styles";
import { MONEY_AREAS, type MoneyAreaKey } from "../../src/utils/featureAreas";
import { signupCta } from "../../src/utils/site";
import { PrototypeShell } from "../shared/PrototypeShell";
import { ScrollCue, SectionNav } from "../shared/SectionNav";
import {
  balanceOf,
  formatGbp,
  formatMonthYear,
  PICTURE,
  SAMPLE_ACCOUNTS,
  SAMPLE_BUDGET,
  SAMPLE_DASHBOARD,
  SAMPLE_SALARY,
} from "../shared/sampleData";
import {
  FaqSection,
  HeroCtas,
  MoreDetailSection,
  PaySection,
  RoughFiguresSection,
  SecuritySection,
} from "../shared/sections";
import { useLazyScene } from "../shared/useLazyScene";
import { StillShape } from "./StillShape";
import type { ShapeKey } from "./shapes";
import "./p6.css";

const one = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
/** A sample figure, or "Not known" where the engine does not know it. */
const gbp = (value: number | null | undefined) =>
  value === null || value === undefined ? "Not known" : formatGbp(value);
const takeHome = PICTURE.takeHome.status === "known" ? PICTURE.takeHome.value : null;
const fixedEnd = PICTURE.fixedRateEnds[0]?.date;

interface Row {
  label: string;
  value: string;
}

interface AreaCopy {
  key: MoneyAreaKey;
  shape: ShapeKey;
  /** One line that says how to read the orb's shape. */
  reading: string;
  rows: Row[];
}

const AREAS: AreaCopy[] = [
  {
    key: "accounts",
    shape: "accounts",
    reading: "Each bubble is one account, sized by its balance.",
    rows: [
      { label: "Home (your estimate)", value: formatGbp(balanceOf(SAMPLE_ACCOUNTS.home)) },
      { label: "Mortgage", value: formatGbp(balanceOf(SAMPLE_ACCOUNTS.mortgage)) },
      { label: "Pension", value: formatGbp(balanceOf(SAMPLE_ACCOUNTS.pension)) },
      { label: "Savings", value: formatGbp(balanceOf(SAMPLE_ACCOUNTS.savings)) },
      { label: "Personal loan", value: formatGbp(balanceOf(SAMPLE_ACCOUNTS.loan)) },
      { label: "Credit card", value: formatGbp(balanceOf(SAMPLE_ACCOUNTS.creditCard)) },
      { label: "Net worth", value: formatGbp(SAMPLE_DASHBOARD.netWorth) },
    ],
  },
  {
    key: "budget",
    shape: "budget",
    reading: "The ring is a month's income, one group per outgoing. The gap is what is left over.",
    rows: [
      { label: "Comes in each month", value: formatGbp(SAMPLE_BUDGET.comesIn) },
      { label: "Goes out each month", value: formatGbp(SAMPLE_BUDGET.goesOut) },
      { label: "Left over each month", value: formatGbp(SAMPLE_BUDGET.leftOver) },
      {
        label: "Breathing room",
        value:
          SAMPLE_DASHBOARD.monthsOfCover === null
            ? "Not known"
            : `${one.format(SAMPLE_DASHBOARD.monthsOfCover)} months`,
      },
    ],
  },
  {
    key: "pay",
    shape: "pay",
    reading: "One bead for every £5,000 a year: salary on the left, take-home pay on the right.",
    rows: [
      { label: "Salary", value: `${gbp(SAMPLE_SALARY)} a year` },
      ...(takeHome
        ? [
            { label: "Take-home pay", value: `${gbp(takeHome.annual)} a year` },
            { label: "Income Tax", value: gbp(takeHome.incomeTax) },
            { label: "National Insurance", value: gbp(takeHome.nationalInsurance) },
            { label: "Pension", value: gbp(takeHome.pension) },
          ]
        : []),
    ],
  },
  {
    key: "savings-and-pension",
    shape: "savings",
    reading:
      "The rising line is interest building on interest. It is an illustration, not a forecast.",
    rows: [
      {
        label: "Cash savings",
        value: `${formatGbp(balanceOf(SAMPLE_ACCOUNTS.savings))} at ${PICTURE.savings.weightedRate}% AER`,
      },
      { label: "Pension", value: formatGbp(balanceOf(SAMPLE_ACCOUNTS.pension)) },
      {
        label: "Paid into the pension",
        value: `${gbp(PICTURE.pensionContributionMonthly)} a month`,
      },
    ],
  },
  {
    key: "debt-and-borrowing",
    shape: "debt",
    reading: "The line runs down to the month the card and loan could be paid off.",
    rows: [
      { label: "Card and loan", value: gbp(PICTURE.debtSummary?.totalDebt) },
      { label: "Could be paid off by", value: PICTURE.debtSummary?.debtFreeDate ?? "Not known" },
      { label: "Mortgage", value: formatGbp(balanceOf(SAMPLE_ACCOUNTS.mortgage)) },
      ...(fixedEnd ? [{ label: "Fixed rate ends", value: formatMonthYear(fixedEnd) }] : []),
    ],
  },
];

/** The orb's reserved space in a section: sticky while the copy scrolls, never under text. */
const Slot: FC<{ shape: ShapeKey; detached?: boolean }> = ({ shape, detached }) => (
  <div
    aria-hidden="true"
    className="p6-slot"
    data-p6-detached={detached ? "" : undefined}
    data-p6-slot={shape}
  >
    <StillShape shape={shape} />
  </div>
);

const Band: FC<{
  id: string;
  name: string;
  titleId: string;
  shape: ShapeKey;
  detached?: boolean;
  variant?: "hero" | "area" | "closing";
  children: ReactNode;
}> = ({ id, name, titleId, shape, detached, variant = "area", children }) => (
  <section aria-labelledby={titleId} className={`p6-band p6-band--${variant}`} id={id}>
    {/* The section-button stop: a marker, so on phones it can sit a lane's height above the
        heading and the heading lands just under the orb's lane, not beneath it. */}
    {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: the section buttons read the heading id from the stop. */}
    <div
      aria-labelledby={titleId}
      className="p6-mark"
      data-proto-name={name}
      data-proto-section=""
    />
    <div className="p6-band__inner">
      <Slot detached={detached} shape={shape} />
      <div className="p6-copy">{children}</div>
    </div>
  </section>
);

const AreaBand: FC<{ copy: AreaCopy }> = ({ copy }) => {
  const area = MONEY_AREAS.find((a) => a.key === copy.key);
  if (!area) return null;
  const titleId = `p6-${copy.key}-title`;
  return (
    <Band id={copy.key} name={area.name} shape={copy.shape} titleId={titleId}>
      <h2 className="p6-title" id={titleId}>
        {area.h1}
      </h2>
      <p className="p6-lead">{area.lead}</p>
      <figure className="p6-figures">
        <figcaption className="p6-figures__caption">
          <span className="p6-example">Example</span> {copy.reading}
        </figcaption>
        <dl className="p6-figures__list tabular-nums">
          {copy.rows.map((row) => (
            <div className="p6-figures__row" key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </figure>
      <Link className="p6-link" to={area.path}>
        About {area.name.toLowerCase()} in Flump
      </Link>
    </Band>
  );
};

/** A plain home page section, as a section-button stop in normal flow. */
const Stop: FC<{ name: string; titleId: string; children: ReactNode }> = ({
  name,
  titleId,
  children,
}) => (
  // biome-ignore lint/a11y/useAriaPropsSupportedByRole: the section buttons read the heading id from here; the section inside is the labelled landmark.
  <div aria-labelledby={titleId} data-proto-name={name} data-proto-section="">
    {children}
  </div>
);

/** The page inside the shell, so its hooks read the shell's motion state. */
const Page: FC = () => {
  const stageRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const { state, reason } = useLazyScene(stageRef, (container, fallback) =>
    import("./guideScene").then(({ createGuideScene }) => createGuideScene(container, fallback)),
  );
  const cta = signupCta();

  // The slots stick just under the header, so they need its height.
  useEffect(() => {
    const header = document.querySelector("header");
    const main = mainRef.current;
    if (!header || !main) return;
    const set = () => main.style.setProperty("--p6-header", `${header.offsetHeight}px`);
    set();
    const observer = new ResizeObserver(set);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Header />
      <main
        className={`${mainContent()} p6-page`}
        data-scene={state}
        id="main"
        ref={mainRef}
        tabIndex={-1}
      >
        <div className="p6-guide">
          {/* Phones with the scene live: one lane at the top that the orb keeps to while the
              copy of the five areas scrolls up beneath it. */}
          <div aria-hidden="true" className="p6-lane" data-p6-lane="" />
          <Band id="top" name="Top" shape="hero" titleId="home-title" variant="hero">
            <h1 className={heroHeading()} id="home-title">
              All your money. One clear picture.
            </h1>
            <p className={heroLead()}>
              Accounts, budget, pay, savings, pension and debts in one place.
            </p>
            <HeroCtas />
            <div className="p6-cue">
              <ScrollCue href="#accounts" label="See the five areas" />
            </div>
          </Band>

          {AREAS.map((copy) => (
            <AreaBand copy={copy} key={copy.key} />
          ))}
        </div>

        <div className="p6-rest">
          <Stop name="Rough figures" titleId="rough-figures-title">
            <RoughFiguresSection />
          </Stop>
          <Stop name="More detail" titleId="more-detail-title">
            <MoreDetailSection />
          </Stop>
          <Stop name="Pay rise" titleId="pay-rise-title">
            <PaySection />
          </Stop>
          <Stop name="Security" titleId="security-title">
            <SecuritySection />
          </Stop>
          <Stop name="Questions" titleId="faq-title">
            <FaqSection />
          </Stop>
        </div>

        <Band
          detached
          id="get-started"
          name="Get started"
          shape="logo"
          titleId="p6-closing-title"
          variant="closing"
        >
          <h2 className="p6-title" id="p6-closing-title">
            Ready to see where you stand?
          </h2>
          <p className="p6-lead">Start with a few rough numbers.</p>
          <div>
            <Button asChild size="lg" variant="primary">
              <a href={cta.href}>{cta.label}</a>
            </Button>
          </div>
        </Band>
      </main>
      <div aria-hidden="true" className="p6-stage" ref={stageRef} />
      {/* For the measuring script only. */}
      <p aria-hidden="true" className="p6-scene-note" data-testid="p6-scene-note">
        Scene: {state === "live" ? "3D" : `still (${reason.toLowerCase()})`}
      </p>
      <SectionNav />
      <Footer />
    </>
  );
};

/**
 * Prototype 6: the orb as a guide. One glass orb on a fixed canvas travels down the page in its own
 * lane and changes shape with each section, tied to scroll: the hero's single orb splits into
 * account bubbles, closes into a budget ring, stacks into pay, stretches into a rising savings line
 * and a debt line that runs down to its end, then settles as the Flump logo at the close.
 */
export const P6: FC = () => (
  <PrototypeShell id="p6" panel="closed">
    <Page />
  </PrototypeShell>
);
