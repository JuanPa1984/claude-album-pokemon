// Cucumber.js config for the API's BDD tests (Gherkin features in test/features).
// ts-node (not tsx) is used because Nest's DI needs emitDecoratorMetadata.
process.env.TS_NODE_TRANSPILE_ONLY ??= 'true';
process.env.TS_NODE_PROJECT ??= 'tsconfig.json';

module.exports = {
  default: {
    paths: ['test/features/**/*.feature'],
    requireModule: ['ts-node/register'],
    require: ['test/support/**/*.ts', 'test/steps/**/*.ts'],
    format: ['progress-bar', 'html:reports/cucumber-report.html'],
  },
};
