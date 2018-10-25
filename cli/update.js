const util = require('../utils/util');

async function invoke(args) {
    await util.spawn("npm.cmd",["update","-g","txm-cli"], process.cwd());
}

module.exports.invoke = invoke;
