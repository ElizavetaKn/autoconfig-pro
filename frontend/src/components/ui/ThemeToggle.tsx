"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
      title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
    >
      <span className={styles.icon}>{theme === "dark" ? "☀" : "◐"}</span>
      <span className={styles.text}>{theme === "dark" ? "Светлая" : "Тёмная"}</span>
    </button>
  );
}