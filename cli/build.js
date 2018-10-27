const util = require('../utils/util');

async function invoke(args) {
    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    var win = process.platform === "win32";
    await util.spawn(win ? "gradlew.bat" : "./gradlew",['build'], sbox.path);
}

module.exports.invoke = invoke;
