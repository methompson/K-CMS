module.exports = {
  verbose: true,
  globals: {},
  collectCoverage: true,
  collectCoverageFrom: [
    "kcms/**/*.js",
    "plugin/**/*.js",
  ],
  coverageReporters: ['text-summary', 'html'],
};
