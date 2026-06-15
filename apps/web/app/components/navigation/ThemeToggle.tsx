import type { FC } from "react";
import { FaMoon, FaSun } from "react-icons/fa";
import { css } from "styled-system/css";
import { useThemeContext } from "~/ThemeContext";

const toggleStyle = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "40px",
  height: "40px",
  borderRadius: "full",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "surface",
  color: "text.primary",
  cursor: "pointer",
  transition: "all 0.2s",
  fontSize: "16px",
  _hover: {
    backgroundColor: "accent",
    borderColor: "primary",
    transform: "rotate(15deg) scale(1.1)",
  },
  _focusVisible: {
    outline: "2px solid",
    outlineColor: "primary",
    outlineOffset: "2px",
  },
});

const ThemeToggle: FC = () => {
  const { theme, toggleTheme } = useThemeContext();

  return (
    <button
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={toggleStyle}
      id="theme-toggle"
      onClick={toggleTheme}
      type="button"
    >
      {theme === "dark" ? (
        <FaSun style={{ color: "#f59e0b" }} />
      ) : (
        <FaMoon style={{ color: "#6363F1" }} />
      )}
    </button>
  );
};

export default ThemeToggle;
