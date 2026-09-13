// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "dist-test/*", "eslint-report.txt"],
  },
  {
    files: ["**/*.{js,jsx}"],
    rules: {
      "react/no-unescaped-entities": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    files: ["server/**/*.js"],
    languageOptions: {
      globals: {
        __dirname: "readonly",
        Buffer: "readonly",
        process: "readonly",
        console: "readonly",
        module: "readonly",
        require: "readonly",
        fetch: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
  },
]);