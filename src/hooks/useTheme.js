import { useEffect, useState } from "react";
function apply(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}
export function useTheme() {
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    const stored = localStorage.getItem("mt-theme");
    const initial =
      stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    apply(initial);
  }, []);
  const set = (next) => {
    setTheme(next);
    apply(next);
    localStorage.setItem("mt-theme", next);
  };
  return { theme, setTheme: set, toggle: () => set(theme === "dark" ? "light" : "dark") };
}
