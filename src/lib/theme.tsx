import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";
type StyleTheme = "classic" | "ctrl";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "dark" | "light";
  styleTheme: StyleTheme;
  setStyleTheme: (styleTheme: StyleTheme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  resolvedTheme: "light",
  styleTheme: "classic",
  setStyleTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

const STYLE_THEME_KEY = "sliceurl-style-theme";

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "sliceurl-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  const [styleTheme, setStyleThemeState] = useState<StyleTheme>(
    () => (localStorage.getItem(STYLE_THEME_KEY) as StyleTheme) || "classic"
  );

  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("light");

  // Apply light/dark theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.add("theme-transitioning");
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
      setResolvedTheme(systemTheme);
    } else {
      root.classList.add(theme);
      setResolvedTheme(theme);
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove("theme-transitioning");
      });
    });
  }, [theme]);

  // Apply style theme (classic/ctrl)
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("theme-classic", "theme-ctrl");
    if (styleTheme === "ctrl") {
      root.classList.add("theme-ctrl");
    } else {
      root.classList.add("theme-classic");
    }
  }, [styleTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = () => {
      if (theme === "system") {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        const systemTheme = mediaQuery.matches ? "dark" : "light";
        root.classList.add(systemTheme);
        setResolvedTheme(systemTheme);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setStyleTheme = (st: StyleTheme) => {
    localStorage.setItem(STYLE_THEME_KEY, st);
    setStyleThemeState(st);
  };

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    resolvedTheme,
    styleTheme,
    setStyleTheme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
