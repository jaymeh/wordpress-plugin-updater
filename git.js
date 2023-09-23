const fs = require('fs').promises;
const os = require("os");
const exec = require('@actions/exec');

let addToIgnore = async function (fileToIgnore, comment = null) {
    if (comment) {
        await fs.appendFile('.gitignore', os.EOL);
        await fs.appendFile('.gitignore', comment);
    }
    await fs.appendFile('.gitignore', os.EOL);
    await fs.appendFile('.gitignore', fileToIgnore);
    await fs.appendFile('.gitignore', os.EOL);

    return true;
};

let isDirty = async function () {
    const isDirty = await exec.getExecOutput('git', ['status', '--short']);
    return isDirty != '';
}

module.exports = { addToIgnore, isDirty };