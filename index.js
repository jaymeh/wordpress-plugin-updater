const core = require('@actions/core');
const exec = require('@actions/exec');

const { findInFile } = require('./filesystem');
const { addToIgnore } = require('./git');

// most @actions toolkit packages have async methods
async function run() {
  try {
    // Create update file.
    const file = 'update-report.md';
    exec.exec('touch', file);

    // Checks for update-report.md in .gitignore.
    const updateReportFound = await findInFile('.gitignore', 'update-report.md');
    if (!updateReportFound) {
      core.debug('update-report.md not found in .gitignore, adding it now.');
      await addToIgnore('update-report.md', '# Ignore Updates Versions file.');
    };

    // Checks for update-report.md in .gitignore.
    const wpCliIgnoreFound = await findInFile('.gitignore', 'wp-cli.phar');
    if (!wpCliIgnoreFound) {
      core.debug('wp-cli.phar not found in .gitignore, adding it now.');
      await addToIgnore('wp-cli.phar', '# Prevent wp-cli.phar script from being added to repository.');
    };

    // Commits.
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
