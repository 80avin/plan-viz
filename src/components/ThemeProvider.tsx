import {
  Dispatch,
  SetStateAction,
  createContext,
  useEffect,
  useState,
} from "react";

import * as base16Themes from "base16";

type IThemes = Exclude<keyof typeof base16Themes, "default">;

const THEMES_MAP = Object.fromEntries(
  Object.entries(base16Themes).filter(([k]) => k !== "default"),
) as Pick<typeof base16Themes, IThemes>;
const THEMES = Object.keys(THEMES_MAP) as IThemes[];

const THEME_PROPERTIES = [
  "base00",
  "base01",
  "base02",
  "base03",
  "base04",
  "base05",
  "base06",
  "base07",
  "base08",
  "base09",
  "base0A",
  "base0B",
  "base0C",
  "base0D",
  "base0E",
  "base0F",
] as const;

type IMode = "light" | "dark";
const applyTheme = (name: keyof typeof THEMES_MAP, mode: IMode = "light") => {
  const theme = THEMES_MAP[name];
  const light = mode === "light";
  for (let i = 0; i < 16; i++) {
    document.documentElement.style.setProperty(
      `--${THEME_PROPERTIES[i]}`,
      theme[THEME_PROPERTIES[i < 8 && !light ? 7 - i : i]],
    );
  }
  document.documentElement.style.setProperty("--scheme", mode);
  document.documentElement.style.setProperty("--theme", theme["scheme"]);
  localStorage.setItem("theme", JSON.stringify([name, mode]));
};

interface IThemeState {
  name: IThemes;
  mode: IMode;
}
interface IThemeContextValue {
  theme: IThemeState;
  THEMES: typeof THEMES;
  setTheme: Dispatch<SetStateAction<IThemeState>>;
}
const defaultTheme: IThemeState = {
  name: "solarized",
  mode: "dark",
};
function loadThemeFromLocalStorage(): IThemeState | null {
  const themeStr = localStorage.getItem("theme");
  if (!themeStr) return null;
  try {
    const _theme = JSON.parse(themeStr);
    if (_theme[0] in THEMES_MAP && ["light", "dark"].includes(_theme[1])) {
      return {
        name: _theme[0],
        mode: _theme[1],
      };
    }
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error("Invalid Theme stored: ", themeStr);
    }
  }
  return null;
}
const initialTheme: IThemeState = loadThemeFromLocalStorage() || defaultTheme;
export const ThemeContext = createContext<IThemeContextValue>({
  theme: initialTheme,
  THEMES,
  setTheme: () => {},
});

function ThemeProvider(props: React.PropsWithChildren<{}>) {
  const { children } = props;
  const [theme, setTheme] = useState<IThemeState>(initialTheme);
  useEffect(() => {
    applyTheme(theme.name, theme.mode);
  }, [theme]);
  return (
    <ThemeContext.Provider value={{ theme, setTheme: setTheme, THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
