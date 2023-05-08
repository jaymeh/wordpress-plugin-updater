const exec = require('@actions/exec');

// Update Items $1 = TOTAL_ROWS, $2 = COMMAND, $3 = TYPE (plugin, theme, language, core), $4 = DIRECTORY.
let updateExtensions = async function (totalRows, command, type, directory) {
    for (let i = 0; i <= totalRows - 1; i++) {
        // const version = JSON.parse(command)[i].old_version;
        // const updatedVersion = JSON.parse(command)[i].new_version;
        const name = JSON.parse(command)[i].name;
        const status = JSON.parse(command)[i].status;
        const pluginPath = `${directory}/${name}`;

        if (status === 'Updated') {
            await exec.exec('echo', [`"${pluginPath}/*"`]);
            // await exec.exec('git', ['add', "${pluginPath}/*"]);
            // execSync(`git add `);
            // execSync(`git commit -m "Updated ${type} ${name.charAt(0).toUpperCase() + name.slice(1)} from ${version} to ${updatedVersion}."`);
            // execSync(`echo "- Updated ${type} ${name.charAt(0).toUpperCase() + name.slice(1)} from ${version} to ${updatedVersion}." >> ${file}`);
        }
    }
};

module.exports = { updateExtensions };