/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "babel-jest",
  testEnvironment: "node",
  transform: {
    "node_modules/puppeteer-real-browser": "ts-jest",
  },
};
