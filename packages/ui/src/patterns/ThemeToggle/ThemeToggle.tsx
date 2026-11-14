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
}

/**
 * System / Light / Dark switch, shared by the web app and the marketing site. "System" follows the
 * operating system and is the default.
 */
export const ThemeToggle: FC<ThemeToggleProps> = ({ preference, onChange, className }) => (
  <fieldset
    aria-label="Colour theme"
    className={cx(themeToggleGroup(), className)}
    id="theme-toggle"
  >
    {OPTIONS.map(({ value, label, icon }) => {
      const checked = preference === value;
      return (
        <button
          key={value}
          aria-pressed={checked}
          aria-label={label}
          className={themeToggleOption()}
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
