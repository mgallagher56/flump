import { Illustration } from "@repo/ui";
import type { FC } from "react";
import { SCENE_PICTURES, SecurityPicture, TilePicture } from "../Pictures";
import "../sheet.css";
import "../round5/sheet5.css";
import { ROUND6_OPTIONS, SAVINGS_PENSION_TILE_OPTIONS } from "./Round6";

const SCENES_FILE = "packages/ui/src/primitives/Illustration/Illustration.scenes.tsx";

/** Where each live scene is used on the marketing site today. */
const USED_ON: Record<string, string> = {
  "check-in": "Home page (rough figures), preview page",
  onboarding: "Home page (closing band), preview page",
  "not-found": "Not found page",
};

const TILES = [
  ["accounts", "Accounts"],
  ["budget", "Budget"],
  ["pay", "Pay"],
  ["savings-and-pension", "Savings and pension"],
  ["debt-and-borrowing", "Debt and borrowing"],
  ["ai-connection", "AI connection"],
] as const;

const LETTERS = ["A", "B", "C", "D", "E"];

/** The owner's pick from each scene's round-six options (an index into ROUND6_OPTIONS). */
const PICKED: Record<string, number> = {
  "empty-goals": 0,
  "empty-savings": 1,
  "empty-debt": 0,
  "empty-pension": 0,
  "check-in": 1,
  "check-in-done": 0,
  onboarding: 1,
  "not-found": 1,
};
const TILE_PICKED = 1;

/**
 * Prototype 11's image sheet, round six: every live spot illustration beside its options in the
 * card and document style, then the features tiles (Savings and pension with its options) and
 * the security picture.
 */
export const Sheet6: FC = () => (
  <section aria-labelledby="p11-sheet-title" className="p11-sheet">
    <header className="p11-sheet__head">
      <h1 id="p11-sheet-title">Prototype 11 images</h1>
      <p>
        Each live spot illustration beside the chosen picture, drawn as tilted cards and paper
        documents like the features tiles, with the options not chosen below it. Sample figures are
        marked Example. Every scene lives in <code>{SCENES_FILE}</code>.
      </p>
    </header>
    <ol className="p11-sheet__list">
      {SCENE_PICTURES.map(({ scene, subject, Picture }) => {
        const options = ROUND6_OPTIONS[scene] ?? [];
        const picked = PICKED[scene] ?? 0;
        return (
          <li className="p11-sheet__item p11-sheet5__item" key={scene}>
            <div className="p11-sheet__meta">
              <h2>{scene}</h2>
              <p>{subject}</p>
              <p className="p11-sheet__used">Used on: {USED_ON[scene] ?? "the web app only"}</p>
            </div>
            <div className="p11-sheet5__row">
              <div className="p11-sheet__live p11-sheet5__live">
                <span className="p11-sheet__tag">Live</span>
                <Illustration scene={scene} size="lg" settle={false} />
              </div>
              <div className="p11-sheet__new p11-sheet5__option">
                <span className="p11-sheet__tag p11-sheet6__chosen">
                  Chosen{options.length > 0 ? `, option ${LETTERS[picked]}` : ""}
                </span>
                <Picture />
              </div>
            </div>
            {options.length > 1 && (
              <div className="p11-sheet5__row p11-sheet6__rest">
                {options.map((Option, i) =>
                  i === picked ? null : (
                    <div className="p11-sheet__new p11-sheet5__option" key={LETTERS[i]}>
                      <span className="p11-sheet__tag">Not chosen, option {LETTERS[i]}</span>
                      <Option />
                    </div>
                  ),
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
    <h2 className="p11-sheet__sub">Features tiles (replace the glass icons)</h2>
    <ul className="p11-sheet__tiles">
      {TILES.map(([key, name]) => (
        <li key={key}>
          <TilePicture area={key} />
          <p>{name}</p>
        </li>
      ))}
    </ul>
    <h2 className="p11-sheet__sub">Savings and pension tile</h2>
    <div className="p11-sheet__item p11-sheet5__item">
      <div className="p11-sheet5__row">
        <div className="p11-sheet__new p11-sheet5__option">
          <span className="p11-sheet__tag p11-sheet6__chosen">
            Chosen, option {LETTERS[TILE_PICKED]}
          </span>
          <TilePicture area="savings-and-pension" />
        </div>
      </div>
      <div className="p11-sheet5__row p11-sheet6__rest">
        {SAVINGS_PENSION_TILE_OPTIONS.map((Option, i) =>
          i === TILE_PICKED ? null : (
            <div className="p11-sheet__new p11-sheet5__option" key={LETTERS[i]}>
              <span className="p11-sheet__tag">Not chosen, option {LETTERS[i]}</span>
              <Option />
            </div>
          ),
        )}
      </div>
    </div>
    <h2 className="p11-sheet__sub">Security (replaces the shield icon tile)</h2>
    <div className="p11-sheet__single">
      <SecurityPicture />
    </div>
  </section>
);
