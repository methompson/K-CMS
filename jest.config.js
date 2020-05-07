module.exports = {
  verbose: true,
  globals: {},
  collectCoverage: true,
  collectCoverageFrom: [
    "k-cms/**/*.js",
    "plugin/**/*.js",
  ],
  coverageReporters: ['text-summary', 'html'],
};
