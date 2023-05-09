const fs = require('fs').promises;
const os = require("os");

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

module.exports = { addToIgnore };