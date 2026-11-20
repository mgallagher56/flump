import type { FC } from "react";
import { Link } from "react-router-dom";
import { MONEY_AREAS, type MoneyAreaKey } from "../../utils/featureAreas";
import { stripHere, stripLink, stripList } from "./AreaStrip.styles";

export interface AreaStripProps {
  /** The area the page is about. Leave it out on a page that is not one of the five areas. */
  current?: MoneyAreaKey;
}

/**
 * "Part of one picture" (E42 S2): the five areas of Flump in the app's order, each a link, with the
 * page's own area marked. It is how every feature page says that the areas make one picture.
 */
export const AreaStrip: FC<AreaStripProps> = ({ current }) => (
  <ul className={stripList()} data-testid="area-strip">
    {MONEY_AREAS.map((area) => {
      const isCurrent = area.key === current;
      return (
        <li key={area.key}>
          <Link
            aria-current={isCurrent ? "page" : undefined}
            className={stripLink({ current: isCurrent })}
            to={area.path}
          >
            <span>{area.name}</span>
            {isCurrent && <span className={stripHere()}>You are here</span>}
          </Link>
        </li>
      );
    })}
  </ul>
);
