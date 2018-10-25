const util = require('../utils/util');

async function invoke(args) {
    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    if (!sbox) {
        console.log("Please configure default sandbox first.");
        return;
    }
    let execpath = sbox.path + "\\Projects\\SI\\Tools\\PBMSimulatorGUI\\SimulationFiles";
    let executable = execpath + "\\SIPbmSimulatorConfigurator.exe";
    let chameleonpath = sbox.path + "\\runtime\\chameleon";
    let gwpath = sbox.path + "\\runtime\\fi-pbmc-fcgateway";
    let simpath = sbox.path + "\\runtime\\pbm-simclient";
    let exeargs = [chameleonpath, gwpath, simpath, sbox.path, "8088", "false"];
    console.log(exeargs);
    util.spawnDetached(executable, exeargs, execpath);
}

module.exports.invoke = invoke;
