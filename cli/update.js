const util = require('../utils/util');

async function invoke(args) {
    var win = process.platform === "win32";
    await util.spawn(win ? "npm.cmd" : "npm",["i","-g","txm-cli@latest"], process.cwd());
}

module.exports.invoke = invoke;
