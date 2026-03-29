import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { logger } from "@/lib/logger";

type ThemeMode = "light" | "dark" | "auto";

interface ThemeContextValue {
  isDark: boolean;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_STORAGE_KEY = "askiep.theme";

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

function getStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "auto") {
      return stored;
    }
  } catch (error) {
    logger.warn("Failed to read theme from localStorage", { error });
  }
  return "auto";
}

function getSystemTheme(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(getStoredTheme);
  const [systemIsDark, setSystemIsDark] = useState(getSystemTheme);

  // Listen to system theme changes
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");

    const handler = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
      logger.debug("System theme changed", { isDark: e.matches });
    };

    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  // Determine effective dark mode state
  const isDark = theme === "auto" ? systemIsDark : theme === "dark";

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    logger.debug("Theme applied to document", { theme, isDark });
  }, [isDark, theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      logger.info("Theme preference saved", { theme: newTheme });
    } catch (error) {
      logger.warn("Failed to save theme to localStorage", { error });
    }
  };

  const value: ThemeContextValue = {
    isDark,
    theme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
