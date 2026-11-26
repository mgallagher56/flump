import { Illustration } from "@repo/ui";
import type { FC } from "react";
import { SCENE_PICTURES, SecurityPicture, TilePicture } from "./Pictures";
import "./sheet.css";

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

/**
 * Prototype 11's image sheet: every live spot illustration beside the picture that replaces it
 * in the hero pieces' family, then the features tiles' pieces and the security picture. For the
 * owner's review at /prototypes/11-images.
 */
export const ImageSheet: FC = () => (
  <section aria-labelledby="p11-sheet-title" className="p11-sheet">
    <header className="p11-sheet__head">
      <h1 id="p11-sheet-title">Prototype 11 images</h1>
      <p>
        Each live spot illustration, redrawn in the style of the hero pieces: layered paper and
        cards with sample figures, marked Example. Every scene lives in <code>{SCENES_FILE}</code>.
      </p>
    </header>
    <ol className="p11-sheet__list">
      {SCENE_PICTURES.map(({ scene, subject, Picture }) => (
        <li className="p11-sheet__item" key={scene}>
          <div className="p11-sheet__meta">
            <h2>{scene}</h2>
            <p>{subject}</p>
            <p className="p11-sheet__used">Used on: {USED_ON[scene] ?? "the web app only"}</p>
          </div>
          <div className="p11-sheet__live">
            <span className="p11-sheet__tag">Live</span>
            <Illustration scene={scene} size="lg" settle={false} />
          </div>
          <div className="p11-sheet__new">
            <span className="p11-sheet__tag">New</span>
            <Picture />
          </div>
        </li>
      ))}
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
