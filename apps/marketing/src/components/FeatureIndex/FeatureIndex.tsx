import { Icon, StatusBadge } from "@repo/ui";
import { ChevronDown } from "lucide-react";
import { type FC, useEffect } from "react";
import {
  FEATURE_GROUPS,
  FEATURE_TAG_LABELS,
  type FeatureGroup,
  type FeatureLine,
} from "../../utils/featureIndex";
import {
  chevron,
  detailText,
  groupGrid,
  groupHeading,
  groupHeadingLink,
  groupSection,
  item,
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
}

/** Opens the line the URL's hash names and scrolls to it (`/features#breathing-room`). */
const openLineFromHash = () => {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id) return;
  const target = document.getElementById(id);
  if (!(target instanceof HTMLDetailsElement)) return;
  target.open = true;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  target.scrollIntoView?.({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  target.querySelector("summary")?.focus({ preventScroll: true });
};

const Line: FC<{ line: FeatureLine }> = ({ line }) => (
  <li>
    <details className={item()} id={line.id}>
      <summary className={summary()}>
        <span className={summaryText()}>
          <span className={lineName()}>{line.name}</span>
          <span className={lineText()}>{line.line}</span>
        </span>
        {line.tag && (
          <StatusBadge size="sm" variant="neutral">
            {FEATURE_TAG_LABELS[line.tag]}
          </StatusBadge>
        )}
        <Icon className={chevron()} icon={ChevronDown} size="sm" />
      </summary>
      <div className={panel()}>
        {line.detail.map((sentence) => (
          <p className={detailText()} key={sentence}>
            {sentence}
          </p>
        ))}
        {line.more && (
          <a className={moreLink()} href={line.more.href}>
            More on the {line.more.page} page
          </a>
        )}
      </div>
    </details>
  </li>
);

/**
 * Every feature as one line, grouped by area (owner, 26 November 2026, option A). Each line is a
 * native `details`: readable and openable without JavaScript, announced as an expandable button,
 * and opened by its hash. Nothing animates, so there is no motion to reduce.
 */
export const FeatureIndex: FC<FeatureIndexProps> = ({
  groups = FEATURE_GROUPS,
  groupHrefs = {},
}) => {
  useEffect(() => {
    openLineFromHash();
    window.addEventListener("hashchange", openLineFromHash);
    return () => window.removeEventListener("hashchange", openLineFromHash);
  }, []);

  return (
    <div className={groupGrid()}>
      {groups.map((group) => {
        const headingId = `group-${group.key}`;
        const href = groupHrefs[group.key];
        return (
          <section aria-labelledby={headingId} className={groupSection()} key={group.key}>
            <h2 className={groupHeading()} id={headingId}>
              {href ? (
                <a className={groupHeadingLink()} href={href}>
                  {group.name}
                </a>
              ) : (
                group.name
              )}
            </h2>
            <ul className={lineList()}>
              {group.lines.map((line) => (
                <Line key={line.id} line={line} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};
