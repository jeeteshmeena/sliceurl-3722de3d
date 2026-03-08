import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";
type ProductTheme = "default" | "norris";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "dark" | "light";
  productTheme: ProductTheme;
  setProductTheme: (pt: ProductTheme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  resolvedTheme: "light",
  productTheme: "default",
  setProductTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

const PRODUCT_THEME_KEY = "sliceurl-product-theme";

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "sliceurl-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  const [productTheme, setProductThemeState] = useState<ProductTheme>(
    () => (localStorage.getItem(PRODUCT_THEME_KEY) as ProductTheme) || "default"
  );

  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("light");

  // Apply light/dark/norris classes
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.add("theme-transitioning");

    // Remove all theme classes
    root.classList.remove("light", "dark", "norris");

    if (productTheme === "norris") {
      // Norris theme is always dark-based
      root.classList.add("norris");
      setResolvedTheme("dark");
    } else if (theme === "system") {
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
  }, [theme, productTheme]);

  // System theme listener
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = () => {
      if (productTheme === "default" && theme === "system") {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        const systemTheme = mediaQuery.matches ? "dark" : "light";
        root.classList.add(systemTheme);
        setResolvedTheme(systemTheme);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, productTheme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    resolvedTheme,
    productTheme,
    setProductTheme: (pt: ProductTheme) => {
      localStorage.setItem(PRODUCT_THEME_KEY, pt);
      setProductThemeState(pt);
    },
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
