const util = require('../utils/util');

async function invoke(args) {
    var win = process.platform === "win32";
    await util.spawn(win ? "npm.cmd" : "npm",["update","-g","txm-cli"], process.cwd());
}

module.exports.invoke = invoke;
