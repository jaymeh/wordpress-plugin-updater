const fs = require('fs').promises;

const findInFile = async function (file, string) {
    const fileContains = await fs.readFile(file)
        .then(function (data) {
            if (data.includes(string)) {
                return true;
            }

            return false;
        }).catch(function (err) {
            throw err;
        });

    return fileContains;
};

module.exports = { findInFile };