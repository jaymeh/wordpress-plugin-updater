const exec = require('@actions/exec');
const core = require('@actions/core');
const fs = require('fs').promises;
const os = require("os");

// Update Items $1 = TOTAL_ROWS, $2 = COMMAND, $3 = TYPE (plugin, theme, language, core), $4 = DIRECTORY.
let updateExtensions = async function (totalRows, command, type, directory) {
    core.debug(`Updating ${type}s.`);
    for (let i = 0; i <= totalRows - 1; i++) {
        const version = JSON.parse(command)[i].old_version;
        const updatedVersion = JSON.parse(command)[i].new_version;
        const name = JSON.parse(command)[i].name;
        const status = JSON.parse(command)[i].status;
        const pluginPath = `${directory}/${name}`;

        core.debug(`Plugin Path is: ${pluginPath}/*`);

        if (status === 'Updated') {
            core.info(`Updating plugin: ${name} at ${pluginPath}`);
            await exec.exec('echo', [`"${pluginPath}/*"`]);

            await exec.exec('git', ['add', `${pluginPath}/*`]);

            var commitMessage = `Updated ${type} ${name.charAt(0).toUpperCase() + name.slice(1)} from ${version} to ${updatedVersion}.`;
            await exec.exec('git', ['commit', '-m', commitMessage]);
            await fs.appendFile('update-report.md', '- ' + commitMessage);
        }
    }

    if (totalRows > 0) {
        await fs.appendFile('update-report.md', os.EOL);
        await fs.appendFile('update-report.md', os.EOL);
    }
};

module.exports = { updateExtensions };