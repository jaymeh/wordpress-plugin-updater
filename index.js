const core = require('@actions/core');
const exec = require('@actions/exec');

const { findInFile } = require('./filesystem');
const { addToIgnore } = require('./git');
const { updateExtensions } = require('./updates');

// most @actions toolkit packages have async methods
async function run() {
  try {
    await exec.exec('ls', '-la');
    await exec.exec('pwd');

    // Create update file.
    const file = 'update-report.md';
    exec.exec('touch', file);

    // WP Path.
    // const withoutGit = core.getInput('ignoreGitChanges', {});
    const withoutGit = true;

    const pluginDirectory = core.getInput('pluginDirectory', {});
    const databaseName = core.getInput('databaseName', {});
    const databaseUsername = core.getInput('databaseUsername', {});
    const databasePassword = core.getInput('databasePassword', {});

    if (withoutGit) {
      core.info('Ignoring git changes.');
    }

    // Checks for update-report.md in .gitignore.
    const updateReportFound = await findInFile('.gitignore', 'update-report.md');
    if (!updateReportFound) {
      core.debug('update-report.md not found in .gitignore, adding it now.');
      await addToIgnore('update-report.md', '# Ignore Updates Versions file.');
    }

    // Commit Changes.
    if (!withoutGit) {
      await exec.exec('git', ['add', '.gitignore']);
      await exec.exec('git', ['commit', '-m', 'Prevent version output from being added to repository.']);
    }

    // Checks for update-report.md in .gitignore.
    const wpCliIgnoreFound = await findInFile('.gitignore', 'wp-cli.phar');
    if (!wpCliIgnoreFound) {
      core.debug('wp-cli.phar not found in .gitignore, adding it now.');
      await addToIgnore('wp-cli.phar', '# Prevent wp-cli.phar script from being added to repository.');
    }

    // Commit Changes.
    if (!withoutGit) {
      await exec.exec('git', ['add', '.gitignore']);
      await exec.exec('git', ['commit', '-m', 'Prevent wp-cli.phar script from being added to repository.']);
    }

    // Download WP-CLI.
    await exec.exec('curl', ['-O', 'https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar']);
    await exec.exec('php', ['wp-cli.phar', 'config', 'create', `--dbname=${databaseName}`, `--dbuser="${databaseUsername} "`, `--dbpass="${databasePassword} "`]);
    await exec.exec('php', ['wp-cli.phar', 'core', 'install', '--url="site.local"', '--title="CI Test Site"', '--admin_user=admin', '--admin_email=admin@example.com']);

    // Update Plugins.
    const updateCommand = await exec.exec(`php wp-cli.phar plugin update --all --format=json`);
    const type = 'plugin';
    const totalRows = JSON.parse(updateCommand).length;

    await updateExtensions(totalRows, updateCommand, type, pluginDirectory);

    // Commits.
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
