const js = require("@eslint/js");
const globals = require("globals");
const vue = require("eslint-plugin-vue");

module.exports = [
  { ignores: ["**/node_modules/**", "**/dist/**"] },
  { files: ["server/**/*.js"], ...js.configs.recommended, languageOptions: { ecmaVersion: "latest", sourceType: "commonjs", globals: globals.node }, rules: { "no-unused-vars": ["error", { caughtErrors: "none" }] } },
  ...vue.configs["flat/recommended"],
  { files: ["client/**/*.{js,vue}"], languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: globals.browser } }
];