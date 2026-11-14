import {
  Children,
  type FC,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
} from "react";
import { cx, type RecipeVariantProps } from "../../../styled-system/css";
import { isKpiCardUnset, KpiCard, type KpiCardProps } from "../../primitives/KpiCard/KpiCard";
import { EmptyState } from "../EmptyState/EmptyState";
import { kpiStripGrid } from "./KpiStrip.styles";

// Replaced statically by the bundler (Vite, Storybook); declared here to avoid a node types dependency.
declare const process: { env: { NODE_ENV?: string } };

export type KpiStripVariants = RecipeVariantProps<typeof kpiStripGrid>;

/** One to four items, enforced by type: a fifth KPI is a compile error. */
export type KpiStripItems =
  | readonly [ReactNode]
  | readonly [ReactNode, ReactNode]
  | readonly [ReactNode, ReactNode, ReactNode]
  | readonly [ReactNode, ReactNode, ReactNode, ReactNode];

/** The single prompt that replaces a strip whose values are mostly unknown (E16 P3.2). */
export interface KpiStripEmptyPrompt {
  /** Names everything missing: "Add your interest rate and term to see your payment breakdown". */
  title: string;
  description?: string;
  /** One action, normally the page's "Update your details" or "Add ..." link or button. */
  action?: ReactNode;
  /** Defaults to `h2`. */
  headingLevel?: "h2" | "h3";
  /** Element id for the prompt. Defaults to a unique id from `useId`, so two strips never clash. */
  id?: string;
}

interface KpiStripBaseProps extends KpiStripVariants {
  /**
   * Shown instead of the cards when half or more of them are unset. A child counts as unset when
   * it is a `KpiCard` showing "Not set" (see `isKpiCardUnset`), or any element given `unset`.
   * Without this prop the cards render as they are and a development warning fires.
   */
  emptyPrompt?: KpiStripEmptyPrompt;
  className?: string;
}

/** Pass either `children` (free form) or `items` (a tuple of up to four, so the cap is typed; give each element a `key`). */
export type KpiStripProps = KpiStripBaseProps &
  ({ children: ReactNode; items?: never } | { items: KpiStripItems; children?: never });

const isUnsetChild = (child: ReactNode): boolean => {
  if (!isValidElement<Partial<KpiCardProps>>(child)) return false;
  const { props } = child;
  if (typeof props.unset === "boolean") return props.unset;
  return child.type === KpiCard ? isKpiCardUnset(props) : false;
};

/** The strip's card elements, with Fragments (at any depth) flattened into their children. */
const flattenCards = (content: ReactNode): ReactElement[] =>
  Children.toArray(content).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return [];
    return child.type === Fragment ? flattenCards(child.props.children) : [child];
  });

/** Counts the strip's cards and how many of them are unset. Fragments are looked through. */
export const countUnsetKpis = (content: ReactNode): { total: number; unset: number } => {
  const cards = flattenCards(content);
  return { total: cards.length, unset: cards.filter(isUnsetChild).length };
};

/**
 * Top-level page metrics: 3 cards by default, 4 at most, in one row from `sm` upwards. At phone
 * width 2 cards sit side by side, 3 stack in one column and 4 sit 2x2, so no card is ever left alone on a row. Uses compact density. With `items`, `columns` follows the item count unless
 * given. When half or more cards are unset, one `EmptyState` prompt replaces the strip (P3.2).
 */
export const KpiStrip: FC<KpiStripProps> = ({
  children,
  items,
  columns,
  emptyPrompt,
  className,
}) => {
  const content = items ?? children;
  const generatedPromptId = useId();
  const { total, unset } = countUnsetKpis(content);
  const mostlyUnset = total > 0 && unset * 2 >= total;

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && mostlyUnset && !emptyPrompt) {
      console.warn(
        `KpiStrip: ${unset} of ${total} cards are "Not set". Pass emptyPrompt to show one prompt instead (E16 P3.2).`,
      );
    }
  }, [mostlyUnset, emptyPrompt, unset, total]);

  if (mostlyUnset && emptyPrompt) {
    return (
      <div className={className} data-kpi-strip="empty">
        <EmptyState
          action={emptyPrompt.action}
          description={emptyPrompt.description}
          headingLevel={emptyPrompt.headingLevel ?? "h2"}
          id={emptyPrompt.id ?? generatedPromptId}
          size="sm"
          title={emptyPrompt.title}
          tone="muted"
        />
      </div>
    );
  }

  const resolvedColumns = columns ?? (items ? (items.length as 1 | 2 | 3 | 4) : 3);
  return (
    <div
      className={cx(kpiStripGrid({ columns: resolvedColumns }), className)}
      data-density="compact"
    >
      {content}
    </div>
  );
};

export default KpiStrip;
