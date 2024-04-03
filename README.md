# Plan Viz

Query Plan Visualizer

## Roadmap

- read verbose query plan
  - all available properties should be captured. data type of a property should be automatically inferred.
- allow defining custom properties (dimensions)
  - custom properties can be javascript like expressions like `deltaCost = '$.statsGroups[0].cost[1] - $.statsGroups[0].cost[0]'`
  - use [ jsep ](https://www.npmjs.com/package/jsep) to parse/evaluate expressions similar to https://github.com/JSONPath-Plus/JSONPath/pull/185/files
-

- [x] Create panels for
  - tree visualization
  - raw query plan text
  - raw query text
  - Stats (table) where facts and dimensions can be configured. Also can be configured how to aggregate (sum/average, etc.) dimensions.
- [x] Use https://www.npmjs.com/package/react-grid-layout or https://www.npmjs.com/package/react-mosaic-component to create resizable, movable, tabbable panels for
  - tree visualization
  - raw query plan text
  - raw query text
  -

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: ["./tsconfig.json", "./tsconfig.node.json"],
    tsconfigRootDir: __dirname,
  },
};
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
