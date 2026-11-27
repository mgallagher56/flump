import { Icon, marketingMs, StatusBadge, usePrefersReducedMotion } from "@repo/ui";
import { ArrowRight, ChevronDown } from "lucide-react";
import { type FC, useEffect, useRef } from "react";
import { GROUP_TONES } from "../../utils/areaOrbTones";
import {
  FEATURE_GROUPS,
  FEATURE_TAG_LABELS,
  type FeatureGroup,
  type FeatureLine,
} from "../../utils/featureIndex";
import { GlassOrb } from "../GlassOrb";
import { SoftCard } from "../SoftCard";
import {
  chevron,
  detailText,
  groupCard,
  groupColumns,
  groupHead,
  groupLink,
  groupOrb,
  groupTitle,
  lineList,
  lineName,
  lineText,
  moreLink,
  panel,
  summary,
  summaryText,
} from "./FeatureIndex.styles";

export interface FeatureIndexProps {
  /** The groups to show. Defaults to every group. */
  groups?: readonly FeatureGroup[];
  /** Where each group's heading links, by group key. Groups without one get a plain heading. */
  groupHrefs?: Readonly<Partial<Record<FeatureGroup["key"], string>>>;
  /** The tone of the band the index sits on (the cards' fill follows it). */
  band?: "card" | "canvas";
}

/** Opens the line with this id, scrolls to it and focuses its summary. Ignores any other id. */
export const openFeatureLine = (id: string) => {
  if (!id) return;
  const target = document.getElementById(id);
  if (!(target instanceof HTMLDetailsElement)) return;
  target.open = true;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  target.scrollIntoView?.({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  target.querySelector("summary")?.focus({ preventScroll: true });
};

/** Opens the line the URL's hash names (`/features#breathing-room`). */
const openLineFromHash = () => {
  const raw = window.location.hash.slice(1);
  try {
    openFeatureLine(decodeURIComponent(raw));
  } catch {
    // A malformed hash (`#%E0`) names no line; leave the page as it is.
  }
};

/** `easings.marketing.calmInOut`, read from its CSS variable for the Web Animations API. */
const easing = () =>
  getComputedStyle(document.documentElement)
    .getPropertyValue("--easings-marketing-calm-in-out")
    .trim() || "ease-in-out";

/**
 * Opens or closes a line's panel to its height on time, instead of jumping (the approved features
 * prototype). Returns false when it cannot animate, so the `details` toggles itself.
 */
export function toggleLine(details: HTMLDetailsElement): boolean {
  const content = details.querySelector<HTMLElement>("[data-line-panel]");
  if (!content || typeof content.animate !== "function") return false;
  const options = { duration: marketingMs("disclosure"), easing: easing() };
  for (const running of content.getAnimations()) running.cancel();
  // Open, or opening: close. Closed, or closing (a cancelled closing never finishes): open.
  if (!details.open || details.dataset.state === "closed") {
    details.dataset.state = "open";
    details.open = true;
    content.animate(
      [
        { height: "0px", opacity: 0 },
        { height: `${content.scrollHeight}px`, opacity: 1 },
      ],
      options,
    );
  } else {
    details.dataset.state = "closed";
    const closing = content.animate(
      [
        { height: `${content.offsetHeight}px`, opacity: 1 },
        { height: "0px", opacity: 0 },
      ],
      options,
    );
    closing.onfinish = () => {
      details.open = false;
      delete details.dataset.state;
    };
  }
  return true;
}

const Line: FC<{ line: FeatureLine }> = ({ line }) => {
  const ref = useRef<HTMLDetailsElement>(null);
  const reduced = usePrefersReducedMotion();
  // The summary is the details element's own button (its click also fires from the keyboard):
  // with motion welcome, the click animates the panel instead of jumping it open or shut.
  useEffect(() => {
    const details = ref.current;
    const summaryEl = details?.querySelector("summary");
    if (reduced || !details || !summaryEl) return;
    const onClick = (event: Event) => {
      if (toggleLine(details)) event.preventDefault();
    };
    summaryEl.addEventListener("click", onClick);
    return () => summaryEl.removeEventListener("click", onClick);
  }, [reduced]);
  return (
    <li>
      <details id={line.id} ref={ref}>
        <summary className={summary}>
          <span className={summaryText}>
            <span className={lineName}>{line.name}</span>
            <span className={lineText}>{line.line}</span>
          </span>
          {line.tag && (
            <StatusBadge size="sm" variant="neutral">
              {FEATURE_TAG_LABELS[line.tag]}
            </StatusBadge>
          )}
          <Icon className={chevron} icon={ChevronDown} size="sm" />
        </summary>
        <div className={panel} data-line-panel="">
          {line.detail.map((sentence) => (
            <p className={detailText} key={sentence}>
              {sentence}
            </p>
          ))}
          {line.more && (
            <a className={moreLink} href={line.more.href}>
              More on the {line.more.page} page
            </a>
          )}
        </div>
      </details>
    </li>
  );
};

/**
 * Every feature as one line, grouped by area (owner, 26 November 2026, option A), in the approved
 * features prototype's form: each group a glass card headed by a small orb in its area's colour, in
 * balanced columns. Each line is a native `details`: readable and openable without JavaScript,
 * announced as an expandable button, and opened by its hash. With motion welcome its panel opens
 * and closes to its height on time and the chevron turns; with reduced motion it opens at once.
 * Each group carries `data-deal-item`, so the page can deal the cards in.
 */
export const FeatureIndex: FC<FeatureIndexProps> = ({
  groups = FEATURE_GROUPS,
  groupHrefs = {},
  band = "canvas",
}) => {
  useEffect(() => {
    openLineFromHash();
    window.addEventListener("hashchange", openLineFromHash);
    return () => window.removeEventListener("hashchange", openLineFromHash);
  }, []);

  return (
    <div className={groupColumns}>
      {groups.map((group) => {
        const headingId = `group-${group.key}`;
        const href = groupHrefs[group.key];
        return (
          <SoftCard
            aria-labelledby={headingId}
            as="section"
            band={band}
            className={groupCard}
            data-deal-item=""
            key={group.key}
          >
            <div className={groupHead}>
              <GlassOrb className={groupOrb} tone={GROUP_TONES[group.key]} />
              <h3 className={groupTitle} id={headingId}>
                {href ? (
                  <a className={groupLink} href={href}>
                    {group.name}
                    <ArrowRight aria-hidden="true" size={18} />
                  </a>
                ) : (
                  group.name
                )}
              </h3>
            </div>
            <ul className={lineList}>
              {group.lines.map((line) => (
                <Line key={line.id} line={line} />
              ))}
            </ul>
          </SoftCard>
        );
      })}
    </div>
  );
};
