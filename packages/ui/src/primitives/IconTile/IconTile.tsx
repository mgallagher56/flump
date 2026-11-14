import type { LucideIcon } from "lucide-react";
import type { FC } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../Icon/Icon";
import { iconTile } from "./IconTile.styles";

export type IconTileTone = "teal" | "sage" | "apricot" | "neutral";

/** The money domains, each with one colour everywhere (E16 P9.3). */
export type IconTileDomain =
  | "net-worth"
  | "mortgage"
  | "pension"
  | "savings"
  | "debt"
  | "pay"
  | "tax";

/** Teal: net worth, mortgage, pension. Sage: savings. Apricot: debt. Neutral: pay and tax. */
export const ICON_TILE_DOMAIN_TONE: Record<IconTileDomain, IconTileTone> = {
  "net-worth": "teal",
  mortgage: "teal",
  pension: "teal",
  savings: "sage",
  debt: "apricot",
  pay: "neutral",
  tax: "neutral",
};

export interface IconTileProps {
  /** A Lucide icon component, e.g. `import { PiggyBank } from "lucide-react"`. */
  icon: LucideIcon;
  /** Picks the tile colour from the domain map. Ignored when `tone` is given. */
  domain?: IconTileDomain;
  /** Explicit tile colour, for things outside the money domains. Defaults to neutral. */
  tone?: IconTileTone;
  /**
   * Accessible name. Omit when the tile sits beside visible text that already names it (the
   * usual case): the tile is then decorative and hidden from assistive technology.
   */
  label?: string;
  className?: string;
}

/** A 40px tinted tile behind an icon, one colour per domain. */
export const IconTile: FC<IconTileProps> = ({ icon, domain, tone, label, className }) => {
  const resolvedTone = tone ?? (domain ? ICON_TILE_DOMAIN_TONE[domain] : "neutral");
  return (
    <span
      className={cx(iconTile({ tone: resolvedTone }), className)}
      data-domain={domain}
      data-tile-tone={resolvedTone}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <Icon icon={icon} size="md" />
    </span>
  );
};

export default IconTile;
