/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",

  // // Add transform for all files in puppeteer-real-browser module in node_modules
  // transform: {
  //   "^.+\\.[t|j]sx?$": "ts-jest",
  //   "node_modules/puppeteer-real-browser/.+\\.[t|j]sx?$": "ts-jest",
  // },

  transformIgnorePatterns: [],
  // transformIgnorePatterns: ["node_modules/(?!(puppeteer-real-browser)/)"],
};
