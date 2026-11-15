import type { FC } from "react";
import { useSceneSettle } from "../../hooks/useSceneSettle";
import { type IllustrationScene, SceneShapeList, sceneDefinitions } from "./Illustration.scenes";
import { illustrationRecipe } from "./Illustration.styles";

export type { IllustrationScene } from "./Illustration.scenes";

export interface IllustrationProps {
  /** Which scene to draw. One scene per view. */
  scene: IllustrationScene;
  size?: "sm" | "md" | "lg";
  id?: string;
  /**
   * E17 Demo 7: Settle animation on first view.
   * If omitted, uses `useSceneSettle(scene)` to run once per visit under motion-safe.
   */
  settle?: boolean;
}

/**
 * Soft decorative artwork for empty states, onboarding and error pages. Always hidden from
 * assistive technology. Never place it inside KPIs, charts or tables, and never use it to show
 * an outcome.
 */
export const Illustration: FC<IllustrationProps> = ({ scene, size = "md", id, settle }) => {
  const autoSettle = useSceneSettle(scene);
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

export default Illustration;
