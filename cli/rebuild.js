const util = require('../utils/util');

async function invoke(args) {
    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    await util.exec("buildClean.sh", sbox.path+"/scripts");
}

module.exports.invoke = invoke;
