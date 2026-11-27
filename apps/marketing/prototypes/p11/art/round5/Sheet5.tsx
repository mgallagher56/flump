import { Illustration } from "@repo/ui";
import type { FC } from "react";
import { SCENE_PICTURES, SecurityPicture, TilePicture } from "../Pictures";
import "../sheet.css";
import { ROUND5_OPTIONS } from "./Round5";
import "./sheet5.css";

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

const LETTERS = ["A", "B", "C", "D"];

/**
 * Prototype 11's image sheet, round five: every live spot illustration beside the options that
 * could replace it, then the features tiles' pieces and the security picture.
 */
export const Sheet5: FC = () => (
  <section aria-labelledby="p11-sheet-title" className="p11-sheet">
    <header className="p11-sheet__head">
      <h1 id="p11-sheet-title">Prototype 11 images</h1>
      <p>
        Each live spot illustration beside its options, drawn as tinted glass with cards for the
        words, in the style of the journey's orbs. Sample figures are marked Example. Every scene
        lives in <code>{SCENES_FILE}</code>.
      </p>
    </header>
    <ol className="p11-sheet__list">
      {SCENE_PICTURES.map(({ scene, subject, Picture }) => {
        const options = ROUND5_OPTIONS[scene] ?? [Picture];
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
              {options.map((Option, i) => (
                <div className="p11-sheet__new p11-sheet5__option" key={LETTERS[i]}>
                  <span className="p11-sheet__tag">Option {LETTERS[i]}</span>
                  <Option />
                </div>
              ))}
            </div>
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
    <h2 className="p11-sheet__sub">Security (replaces the shield icon tile)</h2>
    <div className="p11-sheet__single">
      <SecurityPicture />
    </div>
  </section>
);
