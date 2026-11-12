import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiMoon, FiSun } from "react-icons/fi";
import { useThemeContext } from "../context/ThemeContext";

const toggleStyle = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "36px",
  height: "36px",
  borderRadius: "full",
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  backgroundColor: { base: "slate.50", _dark: "dark.surface" },
  color: { base: "slate.700", _dark: "slate.200" },
  cursor: "pointer",
  transition: "all 0.2s ease",
  fontSize: "16px",
  _hover: {
    borderColor: "indigo.500",
    transform: "rotate(15deg) scale(1.08)",
  },
  _focusVisible: {
    outline: "2px solid",
    outlineColor: "indigo.600",
    outlineOffset: "2px",
  },
});

export const ThemeToggle: FC = () => {
  const { theme, toggleTheme } = useThemeContext();

  return (
    <button
      id="theme-toggle"
      type="button"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={toggleStyle}
      onClick={toggleTheme}
    >
      {theme === "dark" ? (
        <FiSun style={{ color: "var(--colors-status-warning-text)" }} aria-hidden="true" />
      ) : (
        <FiMoon style={{ color: "var(--colors-primary)" }} aria-hidden="true" />
      )}
    </button>
  );
};
