import type { CSSProperties, FC } from "react";
import { heroHeading, heroLead } from "../../src/pages/HomePage/HomePage.styles";
import { MONEY_AREAS } from "../../src/utils/featureAreas";
import { ScrollCue } from "../shared/SectionNav";
import { HeroCtas } from "../shared/sections";

/**
 * Where each area chip starts before it gathers into the row (CSS only, so it plays on first paint
 * with no script and the server-rendered row is already the finished one).
 */
const SCATTER = [
  { dx: -46, dy: -34, r: -7 },
  { dx: 30, dy: 42, r: 5 },
  { dx: -12, dy: -52, r: -3 },
  { dx: 54, dy: -24, r: 6 },
  { dx: -38, dy: 36, r: -5 },
] as const;

/** The compact hero: the real copy, both calls to action, and the five areas gathering into one row. */
export const Hero: FC = () => (
  <section
    aria-labelledby="home-title"
    className="p5-hero"
    data-proto-name="Top"
    data-proto-section=""
    id="p5-top"
  >
    <div className="p5-hero__inner">
      <h1 className={`${heroHeading()} p5-hero__title`} id="home-title">
        All your money. One clear picture.
      </h1>
      <p className={`${heroLead()} p5-hero__lead`}>
        Accounts, budget, pay, savings, pension and debts in one place.
      </p>
      <ul aria-label="The five areas" className="p5-chips">
        {MONEY_AREAS.map((area, i) => {
          const s = SCATTER[i] ?? SCATTER[0];
          return (
            <li
              className="p5-chip"
              key={area.key}
              style={
                {
                  "--p5-dx": `${s.dx}px`,
                  "--p5-dy": `${s.dy}px`,
                  "--p5-r": `${s.r}deg`,
                  "--p5-i": i,
                } as CSSProperties
              }
            >
              <a href={`#p5-${area.key}`}>{area.name}</a>
            </li>
          );
        })}
      </ul>
      <HeroCtas />
      <ScrollCue href="#p5-accounts" label="One area at a time" />
    </div>
  </section>
);
