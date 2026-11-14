import type { LucideIcon } from "lucide-react";
import { Monitor, Moon, Sun } from "lucide-react";
import type { FC } from "react";
import { cx } from "../../../styled-system/css";
import type { ThemePreference } from "../../hooks/useThemePreference";
import { Icon } from "../../primitives/Icon/Icon";
import { themeToggleCycle, themeToggleGroup, themeToggleOption } from "./ThemeToggle.styles";

type ThemeOption = { value: ThemePreference; label: string; icon: LucideIcon };

const SYSTEM_OPTION: ThemeOption = { value: "system", label: "System theme", icon: Monitor };

const OPTIONS: ThemeOption[] = [
  SYSTEM_OPTION,
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
  /**
   * `segmented` (default) shows the three choices side by side. `cycle` is one 44px button that
   * shows the current choice and moves to the next on each press, for a narrow top bar (phones and
   * tablets).
   */
  variant?: "segmented" | "cycle";
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
  variant = "segmented",
}) => {
  if (variant === "cycle") {
    const index = Math.max(
      0,
      OPTIONS.findIndex((option) => option.value === preference),
    );
    const current = OPTIONS[index] ?? SYSTEM_OPTION;
    const next = OPTIONS[(index + 1) % OPTIONS.length] ?? SYSTEM_OPTION;
    return (
      <button
        aria-label={`Colour theme: ${current.value}. Change to ${next.value}`}
        className={cx(themeToggleCycle(), className)}
        data-testid={id}
        id={id}
        title={`Colour theme: ${current.value}`}
        type="button"
        onClick={() => onChange(next.value)}
      >
        <Icon icon={current.icon} size="sm" />
      </button>
    );
  }
  return (
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
};

export default ThemeToggle;
