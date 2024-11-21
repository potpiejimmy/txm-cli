import * as util from '../utils/util.js';
import fs from 'fs';

export async function invoke(args) {
    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    let servers = global.settings.value("servers");
    if (!sbox || !servers) {
        console.log("Please configure default sandbox and server(s) first.");
        return;
    }
    let execpath = sbox.path + "\\runtime\\fi-tools-dev-pbmsimclientgui";
	//Fallback for old sandbox versions, see FITM-1376
	if (!fs.existsSync(execpath)) {
		execpath = sbox.path + "\\fi-tools-dev-pbmsimclientgui\\SimulationFiles";
	}
    let executable = execpath + "\\SIPbmSimulatorConfigurator.exe";
    let chameleonpath = sbox.path + "\\runtime\\chameleon";
    let gwpath = sbox.path + "\\runtime\\fi-pbmc-fcgateway";
    let simpath = sbox.path + "\\runtime\\pbm-simclient";
    let exeargs = [chameleonpath, gwpath, simpath, sbox.path, util.determineServerPort(servers), "false"];
    console.log(exeargs);
    util.spawnDetached(executable, exeargs, execpath);
}
