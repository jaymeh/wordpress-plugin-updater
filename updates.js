const exec = require('@actions/exec');
const core = require('@actions/core');
const fs = require('fs').promises;
const os = require("os");

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
            if (!withoutGit) {
                await exec.exec('git', ['add', `${pluginPath}/*`]);
                await exec.exec('git', ['commit', '-m', updateMessage]);
            }
            await fs.appendFile('update-report.md', '- ' + updateMessage);
            await fs.appendFile('update-report.md', os.EOL);
        }
    }

    if (totalRows > 0) {
        await fs.appendFile('update-report.md', os.EOL);
    }
};

module.exports = { updateExtensions };