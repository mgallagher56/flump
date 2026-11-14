import type { LucideIcon } from "lucide-react";
import { Monitor, Moon, Sun } from "lucide-react";
import type { FC } from "react";
import { cx } from "../../../styled-system/css";
import type { ThemePreference } from "../../hooks/useThemePreference";
import { Icon } from "../../primitives/Icon/Icon";
import { themeToggleGroup, themeToggleOption } from "./ThemeToggle.styles";

const OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "system", label: "System theme", icon: Monitor },
  { value: "light", label: "Light theme", icon: Sun },
  { value: "dark", label: "Dark theme", icon: Moon },
];

export interface ThemeToggleProps {
  /** The current choice, usually from `useThemePreference`. */
  preference: ThemePreference;
  onChange: (preference: ThemePreference) => void;
  className?: string;
  /**
   * Element id (and `data-testid`). Pass a different one for a second toggle on the same page,
   * such as the copy in the mobile drawer.
   */
  id?: string;
}

/**
 * System / Light / Dark switch, shared by the web app and the marketing site. "System" follows the
 * operating system and is the default.
 */
export const ThemeToggle: FC<ThemeToggleProps> = ({
  preference,
  onChange,
  className,
  id = "theme-toggle",
}) => (
  <fieldset
    aria-label="Colour theme"
    className={cx(themeToggleGroup(), className)}
    data-testid={id}
    id={id}
  >
    {OPTIONS.map(({ value, label, icon }) => {
      const checked = preference === value;
      return (
        <button
          key={value}
          aria-pressed={checked}
          aria-label={label}
          className={themeToggleOption()}
          data-testid={`${id}-${value}`}
          type="button"
          onClick={() => onChange(value)}
        >
          <Icon icon={icon} size="sm" />
        </button>
      );
    })}
  </fieldset>
);

export default ThemeToggle;
