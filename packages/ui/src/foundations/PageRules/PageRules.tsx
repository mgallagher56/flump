import { Check, X } from "lucide-react";
import type { FC } from "react";
import { Icon } from "../../primitives/Icon";
import {
  pageRulesCard,
  pageRulesExample,
  pageRulesExampleIcon,
  pageRulesExampleLabel,
  pageRulesExamples,
  pageRulesExampleText,
  pageRulesHeading,
  pageRulesIntro,
  pageRulesList,
  pageRulesRoot,
  pageRulesRule,
  pageRulesTitle,
} from "./PageRules.styles";

export interface PageRule {
  /** Stable id from docs/design/e16-polish/PLAN.md section 3. */
  id: string;
  title: string;
  rule: string;
  good: string;
  bad: string;
}

/** P1 to P13 from the E16 polish plan, section 3, each with one good and one bad example. */
export const PAGE_RULES: readonly PageRule[] = [
  {
    id: "P1",
    title: "Number budget",
    rule: "At most 4 figures in the first view and 12 on the whole page before anything is opened. List rows count one figure each and are budgeted per row.",
    good: "Mortgage: the balance as the headline, then 3 KPI cards. The schedule sits in a drawer.",
    bad: "A first view with 9 figures: a hero, 4 KPI cards with a figure in every caption, and a rate beside each list row.",
  },
  {
    id: "P2",
    title: "One headline, one hero",
    rule: "Each page has one headline figure. It is the largest text after the h1 and the only place the hero surface appears.",
    good: "Dashboard: net worth in the one HeroFigure, with one delta line under it.",
    bad: "A hero block for the headline and a second hero-toned KPI card in the strip below it.",
  },
  {
    id: "P3",
    title: "Not set and zero",
    rule: 'A missing value reads "Not set", smaller and lighter than a real value, with one action. Half or more missing becomes one prompt.',
    good: '"Add your interest rate and term to see your payment breakdown", once, in place of the strip.',
    bad: 'Three KPI cards that read £0, £0 and "Not set" because the rate was never entered.',
  },
  {
    id: "P4",
    title: "One notice per surface, quiet style",
    rule: "One ProjectionNotice per page, wording unchanged, at the foot of the first region with a projection. Never above the h1, never in a drawer.",
    good: "A small note with a hairline above it, in the scenario zone footer.",
    bad: "A tinted banner above the h1, and the same notice repeated under each chart.",
  },
  {
    id: "P5",
    title: "One tabs component",
    rule: "In-page view switching uses Tabs from @repo/ui, at most 4 tabs, hidden when there is one option or the page is empty.",
    good: 'Debt: Tabs with "Your debts" and "Payoff plan".',
    bad: "Underline tabs in one container, a pill nav in another and a pair of toggle buttons in a third.",
  },
  {
    id: "P6",
    title: "Figure ownership",
    rule: "A figure is the headline on one page only. Elsewhere it appears once, outside a hero, with a link to its owner. Within a page it appears once.",
    good: "Accounts shows net worth once, as the list total, linking to the dashboard.",
    bad: "The chart legend, the caption and a KPI card each print the same balance again.",
  },
  {
    id: "P7",
    title: "Copy",
    rule: "Plain words, UK English, sentence case, no em dashes and no judgement. One primary button, named for what it does.",
    good: '"Edit budget" on a page that already has a budget; "24.9% APR" stated as a fact.',
    bad: 'A "Create budget" button when a budget already exists, and a badge that grades a debt.',
  },
  {
    id: "P8",
    title: "Precision",
    rule: 'Whole pounds wherever a figure is read. Percentages to 1 decimal place at most. Durations over 24 months as years and months. Dates as "Mar 2030".',
    good: "£2,194 a month, 4.5%, paid off in 3 years 4 months, by Mar 2030.",
    bad: "£2,194.37 a month, 4.4999%, paid off in 40 months, by 2030-03-01.",
  },
  {
    id: "P9",
    title: "Colour in light mode",
    rule: "About 60% canvas, 30% cards and at most one tinted section, 10% accent. Cards separate by an edge, not a tint. One colour per domain.",
    good: "Sand canvas, white cards with a visible edge, a teal hero and teal buttons.",
    bad: "Tinted KPI cards inside a tinted section, with a coloured header band on each card.",
  },
  {
    id: "P10",
    title: "Charts",
    rule: 'A one-sentence summary with at most 2 figures, direct labels up to 3 series, one annotation, at most 6 ticks, a quiet "Show data" button and no chart under 3 points.',
    good: '"Paid off in Mar 2030", with the payoff month marked and ticks at 2026, 2028 and 2030.',
    bad: 'A chart of 2 points with a legend for one series, 12 ticks reading "Year 1" to "Year 12" and a full-width data bar.',
  },
  {
    id: "P11",
    title: "Motion",
    rule: "Token durations and easings only, under reduced-motion guards. Scenario results cross-fade; nothing counts up.",
    good: "A tab change over the base duration with the standard easing, off when reduced motion is set.",
    bad: "A transition time typed by hand, and a headline that counts up from zero on every load.",
  },
  {
    id: "P12",
    title: "Empty, loading and error",
    rule: "A PageSkeleton after 200ms of loading. An empty page is the header and one EmptyState. Errors keep the app shell and offer one way back.",
    good: "The skeleton in the page's shape, then the page; an empty page with one illustration and one button.",
    bad: "A spinner in the middle of a blank screen, and an empty page that still shows tabs and a £0 strip.",
  },
  {
    id: "P13",
    title: "Page template",
    rule: "Every page renders through PageBody: 1200px at most, gutters of 16, 24 and 40px, 32px between sections, in the order header, hero, KPI strip, your details, scenario zone, drawers.",
    good: 'PageHeader, HeroFigure, KpiStrip, then "Your details" and the ScenarioZone, all inside PageBody.',
    bad: "A page with its own 64px padding and a scenario zone placed above the KPI strip.",
  },
];

const Example: FC<{ tone: "good" | "bad"; text: string }> = ({ tone, text }) => (
  <div className={pageRulesExample({ tone })}>
    <span aria-hidden="true" className={pageRulesExampleIcon({ tone })}>
      <Icon icon={tone === "good" ? Check : X} size="sm" />
    </span>
    <p className={pageRulesExampleText()}>
      <span className={pageRulesExampleLabel({ tone })}>{tone === "good" ? "Do" : "Don't"}</span>
      {text}
    </p>
  </div>
);

/** Foundations page: the E16 page rules (plan section 3) with one good and one bad example each. */
export const PageRules: FC = () => (
  <div className={pageRulesRoot()}>
    <h1 className={pageRulesTitle()}>Page rules</h1>
    <p className={pageRulesIntro()}>
      Every app page meets these rules. Pages get most of them by using the shared components, and
      page tests check the number budget, the single hero and the single notice with expectPageRules
      from @repo/ui/testing.
    </p>
    <ol aria-label="Page rules" className={pageRulesList()}>
      {PAGE_RULES.map((rule) => (
        <li className={pageRulesCard()} data-testid={`page-rule-${rule.id}`} key={rule.id}>
          <h2 className={pageRulesHeading()}>
            {rule.id}. {rule.title}
          </h2>
          <p className={pageRulesRule()}>{rule.rule}</p>
          <div className={pageRulesExamples()}>
            <Example text={rule.good} tone="good" />
            <Example text={rule.bad} tone="bad" />
          </div>
        </li>
      ))}
    </ol>
  </div>
);

export default PageRules;
