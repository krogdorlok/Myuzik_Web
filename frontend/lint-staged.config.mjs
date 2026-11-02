export default {
  "*.{ts,tsx}": [
    "eslint --max-warnings 0 --fix",
    "prettier --write",
    () => "tsc --noEmit",
    "vitest related --run",
  ],
  "*.{js,mjs,json,css,md}": "prettier --write",
};
