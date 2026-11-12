import { Icon } from "@repo/ui";
import type { LucideIcon } from "lucide-react";
import { Monitor, Moon, Sun } from "lucide-react";
import type { FC } from "react";
import type { ThemePreference } from "~/hooks/useTheme";
import { useThemeContext } from "~/ThemeContext";
import { themeToggleGroup, themeToggleOption } from "./ThemeToggle.styles";

const OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "system", label: "System theme", icon: Monitor },
  { value: "light", label: "Light theme", icon: Sun },
  { value: "dark", label: "Dark theme", icon: Moon },
];

/** System / Light / Dark switch. "System" follows the operating system and is the default. */
const ThemeToggle: FC = () => {
  const { preference, setPreference } = useThemeContext();

  return (
    <fieldset aria-label="Colour theme" className={themeToggleGroup()} id="theme-toggle">
      {OPTIONS.map(({ value, label, icon }) => {
        const checked = preference === value;
        return (
          <button
            key={value}
            aria-pressed={checked}
            aria-label={label}
            className={themeToggleOption()}
            type="button"
            onClick={() => setPreference(value)}
          >
            <Icon icon={icon} size="sm" />
          </button>
        );
      })}
    </fieldset>
  );
};

export default ThemeToggle;
