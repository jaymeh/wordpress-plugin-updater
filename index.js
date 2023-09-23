const core = require('@actions/core');
const exec = require('@actions/exec');
const os = require("os");
const fs = require('fs').promises;
// const io = require('@actions/io');

const { findInFile } = require('./filesystem');
const { addToIgnore } = require('./git');
const { updateExtensions, updateACFPro, updateCore, updateLanguages } = require('./updates');

// most @actions toolkit packages have async methods
async function run() {
  try {
    // TODO: Wrap path handling in another function.
    let wordPressPath = core.getInput('wordPressPath', {});
    if (!wordPressPath) {
      wordPressPath = __dirname;
    }
    core.debug(`Wordpress Path: ${wordPressPath}`);
    let wordPressPathTrailingSlash = wordPressPath;
    if (wordPressPath != false) {
      // Add trailing slash if not present.
      if (!wordPressPath.endsWith('/')) {
        core.debug('Wordpress Path does not end with a slash, adding one now.');
        wordPressPathTrailingSlash = `${wordPressPath}/`;
      }
    }

    // Create update file.
    const file = 'update-report.md';
    exec.exec('touch', file);

    const pluginDirectory = wordPressPathTrailingSlash + core.getInput('pluginDirectory', {});
    const themeDirectory = wordPressPathTrailingSlash + core.getInput('themeDirectory', {});
    const databaseName = core.getInput('databaseName', {});
    const databaseUsername = core.getInput('databaseUsername', {});
    const databasePassword = core.getInput('databasePassword', {});

    // If we should update ACF Pro.
    const updateAcfPro = core.getBooleanInput('updateAcfPro', {});
    const acfProKey = core.getInput('acfProKey', {});
    const committerEmail = core.getInput('committerEmail', {});
    const committerName = core.getInput('committerName', {});

    // WP Path.
    let withoutGit = core.getBooleanInput('ignoreGitChanges', {});
    if (withoutGit) {
      core.info('Ignoring git changes.');
    }

    // Set the committer email and name.
    if (!withoutGit) {
      // Ignore warnings about not committing ignored files.
      await exec.exec('git', ['config', 'advice.addIgnoredFile', false]);
      await exec.exec('git', ['config', 'add.ignoreErrors', true]);

      // Setup Committer details.
      await exec.exec('git', ['config', '--global', 'user.email', committerEmail]);
      await exec.exec('git', ['config', '--global', 'user.name', committerName]);
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

    // TODO: Some projects may already have a wp-config.php file as part of the repo.
    // if it exists, we keep a note of it in a variable, force overwrite and remember to discard any changes we make in a later step.

    // TODO: Also check what happens if the path is empty or set to "./".
    await exec.exec('php', ['wp-cli.phar', 'config', 'create', `--path=${wordPressPath}`, `--dbname=${databaseName}`, `--dbuser=${databaseUsername}`, `--dbpass=${databasePassword}`]);
    await exec.exec('php', ['wp-cli.phar', 'core', 'install', `--path=${wordPressPath}`, '--url="site.local"', '--title="CI Test Site"', '--admin_user=admin', '--admin_email=admin@example.com']);

    // Update Plugins.
    const pluginUpdateCommand = await exec.getExecOutput(`php wp-cli.phar plugin update --path=${wordPressPath} --all --format=json`)
      .then((output) => { return output.stdout; })
      .catch((error) => { return error.stderr; });
    const totalPluginsToUpdate = JSON.parse(pluginUpdateCommand).length;

    if (totalPluginsToUpdate > 0) {
      await fs.appendFile('update-report.md', '## Plugins');
      await fs.appendFile('update-report.md', os.EOL);
      await fs.appendFile('update-report.md', os.EOL);

      await updateExtensions(totalPluginsToUpdate, pluginUpdateCommand, 'plugin', pluginDirectory, withoutGit);
    }

    if (updateAcfPro) {
      await updateACFPro(withoutGit, acfProKey, pluginDirectory, wordPressPath);
    }

    // Update Themes.
    const updateCommand = await exec.getExecOutput(`php wp-cli.phar theme update --path=${wordPressPath} --all --format=json`)
      .then((output) => { return output.stdout; })
      .catch((error) => { return error.stderr; });
    let totalThemesToUpdate = JSON.parse(updateCommand).length;

    if (totalThemesToUpdate > 0) {
      // TODO: Add a check to see if the language files are already up to date before putting this in.
      await fs.appendFile('update-report.md', os.EOL);
      await fs.appendFile('update-report.md', '## Themes');
      await fs.appendFile('update-report.md', os.EOL);
      await fs.appendFile('update-report.md', os.EOL);

      await updateExtensions(totalThemesToUpdate, updateCommand, 'theme', themeDirectory, withoutGit);
    }

    // Core.
    await updateCore(wordPressPath, withoutGit);

    // Update Languages/Translations.
    await updateLanguages(wordPressPath, withoutGit);

    // Output the update report from the action.
    const updateReport = await fs.readFile('update-report.md', 'utf8');
    core.setOutput('updateReport', updateReport);

    // TODO: Output a branch name variable based on this bash:
    /*
      full_date=$(date +"%d-%m-%Y")
      branch_date=$(date +"%d-%b-%y")
      branch_name=maintenance/${branch_date,,}
      echo branch_name=$branch_name >> $GITHUB_OUTPUT
      echo date=$full_date >> $GITHUB_OUTPUT
    */
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
