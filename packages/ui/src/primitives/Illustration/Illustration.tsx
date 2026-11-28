import type { FC } from "react";
import { useSceneSettle } from "../../hooks/useSceneSettle";
import { DocumentShapeList } from "./Illustration.documentShapes";
import {
  DOCUMENT_GRID_WIDTH,
  type DocumentPalette,
  type DocumentScene,
  documentDefinitions,
} from "./Illustration.documents";
import { type IllustrationScene, SceneShapeList, sceneDefinitions } from "./Illustration.scenes";
import { documentRecipe, illustrationRecipe } from "./Illustration.styles";

export type { DocumentPalette, DocumentScene } from "./Illustration.documents";
export type { IllustrationScene } from "./Illustration.scenes";

interface CommonProps {
  /**
   * The largest width the picture may take (it fills its container up to this). Flat scenes: sm
   * 140px, md 200px, lg 260px, xl 320px. Document pictures are never narrower than 280px, so their
   * text stays at 12px or more: sm 280px, md 320px, lg 360px, xl 400px. Give a document picture
   * at least 280px of room, or it scrolls sideways on a 320px screen.
   */
  size?: "sm" | "md" | "lg" | "xl";
  id?: string;
}

export interface FlatIllustrationProps extends CommonProps {
  /** The flat scenes (STYLE-GUIDE 8.1), the default style. */
  variant?: "flat";
  /** Which scene to draw. One scene per view. */
  scene: IllustrationScene;
  /**
   * E17 Demo 7: Settle animation on first view.
   * If omitted, uses `useSceneSettle(scene)` to run once per visit under motion-safe.
   */
  settle?: boolean;
}

export interface DocumentIllustrationProps extends CommonProps {
  /** Document cards (STYLE-GUIDE 8.3): tilted cards and paper with sample content. Never moves. */
  variant: "document";
  scene: DocumentScene;
  /**
   * `"app"` (default): the look every app and page uses (STYLE-GUIDE 8.3). `"orb"`: the marketing
   * home page's opt-in look, prototype 11's orb colours on the pension mark and rule, the ticket's
   * top band, the check-in tab's edge, the calendar band, the question bubble and the not-found
   * tabs. Marketing home page only (UX-GUIDELINES MK5).
   */
  palette?: DocumentPalette;
}

export type IllustrationProps = FlatIllustrationProps | DocumentIllustrationProps;

const FlatIllustration: FC<FlatIllustrationProps> = ({ scene, size = "md", id, settle }) => {
  // A caller that sets `settle` decides it; the hook then leaves the scene unclaimed for a real empty state.
  const autoSettle = useSceneSettle(scene, settle === undefined);
  const shouldSettle = settle ?? autoSettle;

  return (
    <svg
      id={id}
      data-testid={id}
      data-scene={scene}
      data-scene-settle={shouldSettle ? "" : undefined}
      aria-hidden="true"
      className={illustrationRecipe({ size })}
      focusable="false"
      role="presentation"
      viewBox="0 0 240 180"
    >
      <SceneShapeList shapes={sceneDefinitions[scene]} />
    </svg>
  );
};

const DocumentIllustration: FC<DocumentIllustrationProps> = ({
  scene,
  size = "md",
  id,
  palette = "app",
}) => {
  const picture = documentDefinitions[scene];
  return (
    <svg
      id={id}
      data-testid={id}
      data-scene={scene}
      data-variant="document"
      data-palette={palette === "orb" ? "orb" : undefined}
      aria-hidden="true"
      className={documentRecipe({ size })}
      focusable="false"
      role="presentation"
      viewBox={`0 0 ${DOCUMENT_GRID_WIDTH} ${picture.height}`}
    >
      <DocumentShapeList palette={palette} shapes={picture.pieces} />
    </svg>
  );
};

/**
 * Soft decorative artwork for empty states, onboarding and error pages, in one of two styles:
 * flat scenes (the default) or document cards (`variant="document"`). Always hidden from
 * assistive technology; the words beside it carry the meaning. Never place it inside KPIs, charts
 * or tables, and never use it to show an outcome.
 */
export const Illustration: FC<IllustrationProps> = (props) =>
  props.variant === "document" ? (
    <DocumentIllustration {...props} />
  ) : (
    // PROTOTYPE ONLY (app design prototypes branch, never merged): the flat scene and its document
    // picture side by side; the level CSS shows one (`data-proto-art`).
    <span data-proto-art="" style={{ display: "contents" }}>
      <span data-proto-flat="" style={{ display: "contents" }}>
        <FlatIllustration {...props} />
      </span>
      <span data-proto-doc="" style={{ display: "none" }}>
        <DocumentIllustration
          variant="document"
          scene={props.scene}
          size={props.size === "sm" ? "sm" : "md"}
        />
      </span>
    </span>
  );

export default Illustration;
