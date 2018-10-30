const util = require('../utils/util');
const deploy = require('./deploy');

async function invoke(args) {
    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    console.log("Running createDb.sh");
    await util.exec("createDb.sh", sbox.path+"/scripts");
}

module.exports.invoke = invoke;
