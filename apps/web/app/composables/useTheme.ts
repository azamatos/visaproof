// The theme: "system" follows the device; "dark" or "light" is the visitor's choice, kept in a cookie so the server
// renders the right colours on the first paint (no flash).
export type Theme = "system" | "dark" | "light";

// The browser's bar takes the page's background (--vp-bg in main.css).
const BAR = { dark: "#010101", light: "#f7f7f5" };

export function useTheme() {
  const theme = useCookie<Theme>("theme", {
    default: () => "system",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  useHead({
    htmlAttrs: { "data-theme": () => (theme.value === "system" ? undefined : theme.value) },
    meta: () =>
      theme.value === "system"
        ? (["dark", "light"] as const).map((t) => ({
            name: "theme-color",
            content: BAR[t],
            media: `(prefers-color-scheme: ${t})`,
          }))
        : [{ name: "theme-color", content: BAR[theme.value] }],
  });
  return theme;
}
