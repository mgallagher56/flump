import type { FC, ReactNode, Ref } from "react";
import {
  hero,
  heroCopy,
  heroCtas,
  heroInner,
  heroLabel,
  heroLead,
  heroNote,
  heroTitle,
} from "./HeroBand.styles";

export interface HeroBandProps {
  /** The h1's id; it labels the band. */
  titleId: string;
  /** A small label above the h1 (an area's name). Left out when it would repeat the title. */
  label?: string;
  title: string;
  lead: string;
  /** A small label under the lead (the AI connection's "Preview"). */
  badge?: ReactNode;
  /** One more line under the lead (and the badge). */
  note?: string;
  /** The band's orbs, behind the copy: `HeroOrbs` (live, S1) or `StillHeroOrbs` (S0). */
  orbs: ReactNode;
  /** The calls to action under the copy; left out, none (the approved S0 pages have none). */
  actions?: ReactNode;
  /** The pause control, under the calls to action, when the band has ambient motion. */
  pause?: ReactNode;
  /** The shorter band of a page whose hero is a title and one line. */
  compact?: boolean;
  /** The band, for a scene that loads as it nears the viewport. */
  ref?: Ref<HTMLElement>;
  children?: ReactNode;
  "data-testid"?: string;
}

/**
 * The first band of the other marketing pages (OTHER-PAGES-PLAN, from the approved prototypes'
 * `OHero` at `prototypes/others`): a small label, the h1, the lead, any calls to action, and the
 * orbs beside the copy (on a shelf under it on phones). The copy itself never moves.
 */
export const HeroBand: FC<HeroBandProps> = ({
  titleId,
  label,
  title,
  lead,
  badge,
  note,
  orbs,
  actions,
  pause,
  compact = false,
  ref,
  children,
  "data-testid": testId,
}) => (
  <section aria-labelledby={titleId} className={hero({ compact })} data-testid={testId} ref={ref}>
    {orbs}
    <div className={heroInner}>
      <div className={heroCopy}>
        {label && label !== title && <p className={heroLabel}>{label}</p>}
        <h1 className={heroTitle} id={titleId}>
          {title}
        </h1>
        <p className={heroLead}>{lead}</p>
        {badge}
        {note && <p className={heroNote}>{note}</p>}
        {children}
        {actions && <div className={heroCtas}>{actions}</div>}
        {pause}
      </div>
    </div>
  </section>
);
