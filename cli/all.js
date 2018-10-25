const util = require('../utils/util');
const deploy = require('./deploy');

async function invoke(args) {
    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    console.log("Running buildClean.sh");
    await util.exec("buildClean.sh", sbox.path+"/scripts");
    console.log("Running createDb.sh");
    await util.exec("createDb.sh", sbox.path+"/scripts");
    await deploy.invoke();
}

module.exports.invoke = invoke;
