const core = require('@actions/core');
const {
  handleBranchesOption,
  handleDryRunOption,
  handleCiOption,
  handleExtends,
  handleTagFormat,
  handleRepositoryUrlOption,
} = require('./handleOptions');
const setUpJob = require('./setUpJob.task');
const installSpecifyingVersionSemantic = require('./installSpecifyingVersionSemantic.task');
const preInstall = require('./preInstall.task');
const cleanupNpmrc = require('./cleanupNpmrc.task');
const windUpJob = require('./windUpJob.task');
const inputs = require('./inputs.json');

/**
 * Release main task
 * @returns {Promise<void>}
 */
const release = async () => {
  if (core.getInput(inputs.working_directory)) {
    process.chdir(core.getInput(inputs.working_directory));
  }
  await setUpJob();
  await installSpecifyingVersionSemantic();
  await preInstall(core.getInput(inputs.extra_plugins));
  await preInstall(core.getInput(inputs.extends));

  if (core.getInput(inputs.unset_gha_env) === 'true') {
    core.debug('Unset GITHUB_ACTIONS environment variable');
    delete process.env.GITHUB_ACTIONS;
  }

  const semanticRelease = await import('semantic-release');

  const result = await semanticRelease.default({
    branches: [
      'main',
      {
        name: process.env.GITHUB_REF_NAME,
        prerelease: 'beta'
      }
    ],
    ...handleDryRunOption(),
    ...handleCiOption(),
    ...handleExtends(),
    ...handleTagFormat(),
    ...handleRepositoryUrlOption(),
    plugins: [
      '@semantic-release/changelog',
      'semantic-release-jira-notes',
      '@semantic-release/git',
      '@semantic-release/commit-analyzer',
      '@semantic-release/github'
      [
        "semantic-release-jira-notes", {
      "jiraHost": "jetsalesbrasil.atlassian.net",
      "ticketPrefixes": ["CHAT", "US"]
    }]
    ]
  });

  await cleanupNpmrc();
  await windUpJob(result);
};

module.exports = () => {
  core.debug('Initialization successful');
  release().catch(core.setFailed);
};
