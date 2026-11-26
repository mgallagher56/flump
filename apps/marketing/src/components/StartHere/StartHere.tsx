import type { FC } from "react";
import { ALL_FEATURE_LINES, START_HERE } from "../../utils/featureIndex";
import { goal, goalItem, goalLink, goalLinks, goalList, heading, strip } from "./StartHere.styles";

const nameOf = (id: string): string => {
  const line = ALL_FEATURE_LINES.find((candidate) => candidate.id === id);
  if (!line) throw new Error(`START_HERE names an unknown line: ${id}`);
  return line.name;
};

/**
 * "Start here": a few goals in plain words, each with links to the lines on the page it involves.
 * A link only changes the hash, so the index opens and scrolls to that line.
 */
export const StartHere: FC = () => (
  <nav aria-labelledby="start-here-title" className={strip()}>
    <h2 className={heading()} id="start-here-title">
      Start here
    </h2>
    <ul className={goalList()}>
      {START_HERE.map((entry) => (
        <li className={goalItem()} key={entry.goal}>
          <p className={goal()}>{entry.goal}</p>
          <ul aria-label={entry.goal} className={goalLinks()}>
            {entry.lines.map((id) => (
              <li key={id}>
                <a className={goalLink()} href={`#${id}`}>
                  {nameOf(id)}
                </a>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  </nav>
);
