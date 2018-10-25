const util = require('../utils/util');

async function invoke(args) {
    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    await util.spawn("gradlew.bat",['build'], sbox.path);
}

module.exports.invoke = invoke;
