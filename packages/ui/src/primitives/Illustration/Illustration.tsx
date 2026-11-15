import type { FC } from "react";
import { type IllustrationScene, SceneShapeList, sceneDefinitions } from "./Illustration.scenes";
import { illustrationRecipe } from "./Illustration.styles";

export type { IllustrationScene } from "./Illustration.scenes";

export interface IllustrationProps {
  /** Which scene to draw. One scene per view. */
  scene: IllustrationScene;
  size?: "sm" | "md" | "lg";
  id?: string;
}

/**
 * Soft decorative artwork for empty states, onboarding and error pages. Always hidden from
 * assistive technology. Never place it inside KPIs, charts or tables, and never use it to show
 * an outcome.
 */
export const Illustration: FC<IllustrationProps> = ({ scene, size = "md", id }) => {
  return (
    <svg
      id={id}
      data-testid={id}
      data-scene={scene}
      data-scene-settle=""
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

export default Illustration;
