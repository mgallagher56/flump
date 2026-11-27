import { Icon, StatusBadge } from "@repo/ui";
import { ArrowRight, ChevronDown } from "lucide-react";
import { type FC, type MouseEvent, useEffect, useRef } from "react";
import { openFeatureLine } from "../../../src/components/FeatureIndex";
import { Footer } from "../../../src/components/Footer";
import { Header } from "../../../src/components/Header";
import { mainContent } from "../../../src/pages/HomePage/HomePage.styles";
import { AI_CONNECTION, FEATURES_INDEX, MONEY_AREAS } from "../../../src/utils/featureAreas";
import {
  ALL_FEATURE_LINES,
  FEATURE_GROUPS,
  FEATURE_TAG_LABELS,
  type FeatureGroup,
  type FeatureLine,
  START_HERE,
} from "../../../src/utils/featureIndex";
import { GlassOrb } from "../../p11/art/GlassOrb";
import { type OrbToneName, STOP_ORB_TONES } from "../../p11/journeyTypes";
import { dealIn } from "../../p11/sections/moments";
import { useMotion } from "../../shared/motion";
import { EASE, TIMING, usePace } from "../../shared/pace";
import { usePointerLightAndTilt } from "../../shared/round3";
import { arriveAll, type Moment, OBand, OHero } from "../blocks";
import { OtherShell } from "../OtherShell";
import { heroLayout, pageLayout } from "../scene/layouts";
import { PageOrbs } from "../scene/SceneLayers";

/*
 * The features index (family A) in prototype 11's language: the hero with the scene, "Start here"
 * as four glass cards, then every group as a glass card headed by a small orb in its area's
 * journey colour, its lines opening smoothly. (The home tiles' pictures were tried as emblems and
 * dropped: eight pictures in one band, and they crowded the headings.) Copy and lines come from
 * production's `utils/featureAreas` and `utils/featureIndex` unchanged.
 */

const GROUP_HREFS: Partial<Record<FeatureGroup["key"], string>> = Object.fromEntries(
  [...MONEY_AREAS, AI_CONNECTION].map((feature) => [feature.key, feature.path]),
);

/** Each group's orb: its area's journey colour; the groups that are not areas take the other set. */
const GROUP_TONE: Record<FeatureGroup["key"], OrbToneName> = {
  home: "sky",
  accounts: STOP_ORB_TONES.accounts[0],
  budget: STOP_ORB_TONES.budget[0],
  pay: STOP_ORB_TONES.pay[0],
  "savings-and-pension": STOP_ORB_TONES["savings-and-pension"][0],
  "debt-and-borrowing": STOP_ORB_TONES["debt-and-borrowing"][0],
  "ai-connection": "rose",
  settings: "teal",
};

const nameOf = (id: string) => ALL_FEATURE_LINES.find((line) => line.id === id)?.name ?? id;

/**
 * A line as a native `details` (readable and openable with no script, as production), whose panel
 * opens and closes to its height on time instead of jumping. With reduced motion it opens natively.
 */
const Line: FC<{ line: FeatureLine }> = ({ line }) => {
  const ref = useRef<HTMLDetailsElement>(null);
  const { reduced } = useMotion();
  const pace = usePace();
  const onToggleClick = (event: MouseEvent) => {
    const details = ref.current;
    const panel = details?.querySelector<HTMLElement>(".o1-line__panel");
    if (reduced || !details || !panel || typeof panel.animate !== "function") return;
    event.preventDefault();
    const options = { duration: pace.ms(TIMING.disclosure), easing: EASE.inOut };
    for (const running of panel.getAnimations()) running.cancel();
    if (!details.open) {
      details.dataset.state = "open";
      details.open = true;
      panel.animate(
        [
          { height: "0px", opacity: 0 },
          { height: `${panel.scrollHeight}px`, opacity: 1 },
        ],
        options,
      );
    } else {
      details.dataset.state = "closed";
      const closing = panel.animate(
        [
          { height: `${panel.offsetHeight}px`, opacity: 1 },
          { height: "0px", opacity: 0 },
        ],
        options,
      );
      closing.onfinish = () => {
        details.open = false;
        delete details.dataset.state;
      };
    }
  };
  return (
    <li>
      <details className="o1-line" id={line.id} ref={ref}>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a summary is the details element's own button; its click also fires from the keyboard. */}
        <summary className="o1-line__summary" onClick={onToggleClick}>
          <span className="o1-line__text">
            <span className="o1-line__name">{line.name}</span>
            <span className="o1-line__line">{line.line}</span>
          </span>
          {line.tag && (
            <StatusBadge size="sm" variant="neutral">
              {FEATURE_TAG_LABELS[line.tag]}
            </StatusBadge>
          )}
          <Icon className="o1-line__chevron" icon={ChevronDown} size="sm" />
        </summary>
        <div className="o1-line__panel">
          {line.detail.map((sentence) => (
            <p key={sentence}>{sentence}</p>
          ))}
          {line.more && (
            <a className="o1-link" href={line.more.href}>
              More on the {line.more.page} page
            </a>
          )}
        </div>
      </details>
    </li>
  );
};

/** Each group card arrives as it nears the viewport (dealt, time-based, transforms cleared). */
const groupsMoment: Moment = (kit, root, pace) => {
  for (const group of root.querySelectorAll<HTMLElement>(".o1-group")) {
    dealIn(kit, group, [group], pace);
  }
};

const StartHere: FC = () => (
  <OBand
    bubbles="b"
    id="start-here"
    moment={arriveAll(".o1-goal", 16)}
    title="Start here"
    tone="card"
  >
    <ul className="o1-goals">
      {START_HERE.map((entry) => (
        <li className="o1-goal" key={entry.goal}>
          <div className="o1-goal__card p11-soft-card" data-tilt="">
            <p className="o1-goal__title">{entry.goal}</p>
            <ul aria-label={entry.goal} className="o1-goal__links">
              {entry.lines.map((id) => (
                <li key={id}>
                  <a
                    className="o1-link"
                    href={`#${id}`}
                    onClick={() => {
                      if (window.location.hash === `#${id}`) openFeatureLine(id);
                    }}
                  >
                    {nameOf(id)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ul>
  </OBand>
);

const Groups: FC = () => {
  useEffect(() => {
    const fromHash = () => {
      try {
        openFeatureLine(decodeURIComponent(window.location.hash.slice(1)));
      } catch {
        // A malformed hash names no line.
      }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);
  return (
    <OBand bubbles="c" id="every-feature" moment={groupsMoment} tone="canvas">
      <div className="o1-groups">
        {FEATURE_GROUPS.map((group) => {
          const headingId = `group-${group.key}`;
          const href = GROUP_HREFS[group.key];
          return (
            <section aria-labelledby={headingId} className="o1-group p11-soft-card" key={group.key}>
              <div className="o1-group__head">
                <GlassOrb size={34} tone={GROUP_TONE[group.key]} />
                <h3 className="o1-group__title" id={headingId}>
                  {href ? (
                    <a className="o1-group__link" href={href}>
                      {group.name}
                      <ArrowRight aria-hidden="true" size={18} />
                    </a>
                  ) : (
                    group.name
                  )}
                </h3>
              </div>
              <ul className="o1-lines">
                {group.lines.map((line) => (
                  <Line key={line.id} line={line} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </OBand>
  );
};

const Body: FC = () => {
  const ref = useRef<HTMLElement>(null);
  usePointerLightAndTilt(ref, 6);
  return (
    <main className={mainContent()} id="main" ref={ref} tabIndex={-1}>
      <OHero
        layout={heroLayout(["sky", "violet", "teal", "rose"])}
        lead={FEATURES_INDEX.lead}
        title={FEATURES_INDEX.title}
        titleId="features-title"
      >
        {FEATURES_INDEX.intro.map((paragraph) => (
          <p className="o1-hero__intro" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </OHero>
      <StartHere />
      <Groups />
    </main>
  );
};

export const FeaturesIndexProto: FC = () => (
  <OtherShell defaultLevel="s1" id="features">
    <PageOrbs layout={pageLayout(["sky", "violet", "teal", "rose"])} />
    <Header />
    <Body />
    <Footer />
  </OtherShell>
);
