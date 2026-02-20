export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/coverage/**",
    ],
  },
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];
