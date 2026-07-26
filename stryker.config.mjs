// @ts-check
/**
 * Mutation testing do motor determinístico (ADR-075).
 *
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
const config = {
  packageManager: "npm",
  testRunner: "vitest",
  vitest: { configFile: "vitest.config.ts" },
  reporters: ["html", "json", "clear-text", "progress"],
  htmlReporter: { fileName: "reports/mutation/index.html" },
  jsonReporter: { fileName: "reports/mutation/report.json" },
  coverageAnalysis: "perTest",
  concurrency: 8,
  timeoutMS: 20000,
  incremental: true,
  incrementalFile: "reports/mutation/incremental.json",
  mutate: [
    "src/lucid/**/*.ts",
    "src/locales/**/*.ts",
    "src/report/**/*.ts",
    "src/importers/**/*.ts",
    "!src/**/*.test.ts",
  ],
};

export default config;
