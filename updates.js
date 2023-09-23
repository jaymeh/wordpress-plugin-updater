const exec = require('@actions/exec');
const core = require('@actions/core');
const fs = require('fs').promises;
const os = require("os");
const git = require('./git');

let updateExtensions = async function (totalRows, command, type, directory, withoutGit) {
    core.debug(`Found ${totalRows} ${type}(s).`);
    const commandOutput = JSON.parse(command);
    for (let i = 0; i <= totalRows - 1; i++) {
        const version = commandOutput[i].old_version;
        const updatedVersion = commandOutput[i].new_version;
        const name = commandOutput[i].name;
        const status = commandOutput[i].status;
        const pluginPath = `${directory}/${name}`;

        core.debug(`Plugin Path is: ${pluginPath}/*`);

        if (status === 'Updated') {
            core.info(`Updating plugin: ${name} at ${pluginPath}`);
            await exec.exec('echo', [`"${pluginPath}/*"`]);

            var updateMessage = `Updated ${type} ${name.charAt(0).toUpperCase() + name.slice(1)} from ${version} to ${updatedVersion}.`;
            let failed = false;
            if (!withoutGit) {
                // TODO: Test we can actually add first.
                try {
                    await exec.exec('git', ['add', `${pluginPath}/*`, '--dry-run']);

                    await exec.exec('git', ['add', `${pluginPath}/*`]);
                    await exec.exec('git', ['commit', '-m', updateMessage]);
                } catch (error) {
                    core.info(error.stderr);
                    failed = true;
                }
            }

            if (!failed) {
                // TODO: Think about adding a status here to say if it failed.
                await fs.appendFile('update-report.md', `- ${updateMessage}`);
                await fs.appendFile('update-report.md', os.EOL);
            }
        }
    }
};

let updateACFPro = async function (withoutGit, acfProKey, pluginDirectory, wordPressPath) {
    // TODO: See if we can find a way to get the version of ACF Pro.
    await exec.exec('php', ['wp-cli.phar', 'plugin', 'install', `https://connect.advancedcustomfields.com/v2/plugins/download?p=pro&k=${acfProKey}`, `--path=${wordPressPath}`, '--force']);

    if (!withoutGit) {
        // Add all changes to git.
        await exec.exec(`git add ${pluginDirectory}`);
        await exec.exec(`git commit -m "Updated ACF Pro."`);
    }

    await fs.appendFile('update-report.md', '- Updated ACF Pro.');
    await fs.appendFile('update-report.md', os.EOL);
};

let updateCore = async function (wordPressPath, withoutGit) {
    let oldCoreVersion = await exec.getExecOutput(`php wp-cli.phar core version --allow-root --path=${wordPressPath}`)
        .then((output) => { return output.stdout; })
        .catch((error) => { return error.stderr; });

    oldCoreVersion = oldCoreVersion.replace(/(\r\n|\n|\r)/gm, "");

    await exec.getExecOutput(`php wp-cli.phar core update --path=${wordPressPath}`)
        .then((output) => { return output.stdout; })
        .catch((error) => { return error.stderr; });

    let newCoreVersion = await exec.getExecOutput(`php wp-cli.phar core version --allow-root --path=${wordPressPath}`)
        .then((output) => { return output.stdout; })
        .catch((error) => { return error.stderr; });

    newCoreVersion = newCoreVersion.replace(/(\r\n|\n|\r)/gm, "");

    if (oldCoreVersion != newCoreVersion) {
        await fs.appendFile('update-report.md', os.EOL);
        await fs.appendFile('update-report.md', '## Core');
        await fs.appendFile('update-report.md', os.EOL);
        await fs.appendFile('update-report.md', os.EOL);
        await fs.appendFile('update-report.md', `- Updated Core from ${oldCoreVersion} to ${newCoreVersion}.`);
        await fs.appendFile('update-report.md', os.EOL);

        if (!withoutGit) {
            // Add all changes to git.
            await exec.exec(`git add ${wordPressPath}`);
            await exec.exec(`git commit -m "Updated Core from ${oldCoreVersion} to ${newCoreVersion}."`);
        }
    }
};

let updateLanguages = async function (wordPressPath, withoutGit) {
    // TODO: Function could do with a little bit of cleanup.
    // TODO: Add a check to see if the language files are already up to date before parsing this.
    await fs.appendFile('update-report.md', os.EOL);
    await fs.appendFile('update-report.md', '## Languages');
    await fs.appendFile('update-report.md', os.EOL);

    const languages = [
        'core',
        'plugin',
        'theme',
    ];

    for (let i = 0; i <= languages.length - 1; i++) {
        let all = '';
        if (languages[i] != 'core') {
            all = '--all';
        }

        await exec.getExecOutput(`php wp-cli.phar language ${languages[i]} update  ${all} --path=${wordPressPath}`);
        const isDirty = await git.isDirty();
        if (!withoutGit && isDirty) {
            // Add all changes to git.
            await exec.exec(`git add ${wordPressPath}`);
            await exec.exec(`git commit -m "Updated ${languages[i]} language files."`);
        }

        if (isDirty) {
            await fs.appendFile('update-report.md', `- Updated ${languages[i]} language files.`);
            await fs.appendFile('update-report.md', os.EOL);
        }
    }
}

module.exports = { updateExtensions, updateACFPro, updateCore, updateLanguages };