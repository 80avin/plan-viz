import { useCallback, useContext } from "react";
import { ThemeContext } from "./ThemeProvider";

const ThemeSelect = () => {
  const themeContext = useContext(ThemeContext);
  const handleThemeChange = useCallback((e) => {
    const name = e.target.form["theme-select"].selectedOptions[0].value;
    const mode = e.target.form["dark-mode-input"].checked ? "dark" : "light";
    themeContext.setTheme({ name, mode });
    console.log(e);
  }, []);
  return (
    <>
      <form>
        <label>
          Theme:{" "}
          <select name="theme-select" onChange={handleThemeChange}>
            {themeContext.THEMES.map((t) => (
              <option
                key={t}
                value={t}
                selected={t === themeContext.theme.name}
              >
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Dark
          <input
            name="dark-mode-input"
            onChange={handleThemeChange}
            type="checkbox"
            checked={themeContext.theme.mode === "dark"}
          />
        </label>
      </form>
    </>
  );
};

export default ThemeSelect;
