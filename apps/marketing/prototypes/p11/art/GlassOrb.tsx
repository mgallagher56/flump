import type { LucideIcon } from "lucide-react";
import type { CSSProperties, FC } from "react";
import "./art.css";

/** The four orb colours: set A sky and teal, set B violet and rose. */
export type OrbTone = "sky" | "teal" | "violet" | "rose";

/**
 * A clear glass orb drawn in CSS, the page's one image family (the journey's orbs, in 2D): a
 * nearly clear body, a coloured rim and caustic, a specular highlight and a soft coloured shadow.
 * Optional icon inside, in the tone's chart colour. Decorative: always aria-hidden.
 */
export const GlassOrb: FC<{
  tone: OrbTone;
  icon?: LucideIcon;
  className?: string;
  size?: number | string;
  style?: CSSProperties;
}> = ({ tone, icon: Icon, className = "", size, style }) => (
  <span
    aria-hidden="true"
    className={`p11-orb ${className}`}
    data-tone={tone}
    style={
      {
        ...(size !== undefined
          ? { "--orb-size": typeof size === "number" ? `${size}px` : size }
          : {}),
        ...style,
      } as CSSProperties
    }
  >
    {Icon && <Icon className="p11-orb__icon" strokeWidth={1.75} />}
  </span>
);
