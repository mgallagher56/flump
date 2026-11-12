import type { FC } from "react";
import { type IllustrationScene, scenes } from "./Illustration.scenes";
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
  const Scene = scenes[scene];
  return (
    <svg
      id={id}
      data-testid={id}
      data-scene={scene}
      aria-hidden="true"
      className={illustrationRecipe({ size })}
      focusable="false"
      role="presentation"
      viewBox="0 0 240 180"
    >
      <Scene />
    </svg>
  );
};

export default Illustration;
