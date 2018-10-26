const util = require('../utils/util');

async function invoke(args) {
    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    let servers = global.settings.value("servers");
    if (!sbox || !servers) {
        console.log("Please configure default sandbox and server(s) first.");
        return;
    }
    let execpath = sbox.path + "\\Projects\\SI\\Tools\\PBMSimulatorGUI\\SimulationFiles";
    let executable = execpath + "\\SIPbmSimulatorConfigurator.exe";
    let chameleonpath = sbox.path + "\\runtime\\chameleon";
    let gwpath = sbox.path + "\\runtime\\fi-pbmc-fcgateway";
    let simpath = sbox.path + "\\runtime\\pbm-simclient";
    let exeargs = [chameleonpath, gwpath, simpath, sbox.path, determineServerPort(servers), "false"];
    console.log(exeargs);
    util.spawnDetached(executable, exeargs, execpath);
}

function determineServerPort(servers) {
    let d = global.settings.value("defaults.server");
    for (let key of Object.keys(servers)) {
        let server = servers[key];
        if (server.name.startsWith(d) && server.type == 'txm') return server.port;
    }
    return 8080;
}

module.exports.invoke = invoke;
