import { useState } from "react";
import { applyTheme, getInitialTheme, Theme } from "../lib/theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    applyTheme(next);
    setTheme(next);
  }

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      aria-label="Toggle color theme"
      type="button"
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
