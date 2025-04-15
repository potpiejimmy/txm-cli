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

    const GW_PORT = 9001;

    // if FC Gateway not running already, start it up along with the Chameleons in a shared terminal window with tabs.
    if (!(await util.isPortOpen(GW_PORT))) {
        try {

            // configure FC Gateway port
            let cfgFile = gwpath + "/config/PCEFIFCGateway.xml";
            let cfg = fs.readFileSync(cfgFile);
            cfg = cfg.toString().replace(/(<sectionEntry name="ServerUrl">http:\/\/localhost:)(\d+)(<\/sectionEntry>)/m, "$1" + util.determineServerPort(servers) + "$3");
            fs.writeFileSync(cfgFile, cfg);

            console.log("Starting Gateway and Chameleons terminal window.");
            let cmdLine = "wt";
            cmdLine += " new-tab -d \"" + gwpath + "\\bin\" \"" + gwpath + "\\bin\\startFCGateway.cmd\"";
            cmdLine += " ; new-tab -d \"" + chameleonpath + "\\bin\" \"" + chameleonpath + "\\bin\\K1.cmd\"";
            cmdLine += " ; new-tab -d \"" + chameleonpath + "\\bin\" \"" + chameleonpath + "\\bin\\K19.cmd\"";
            cmdLine += " ; new-tab -d \"" + chameleonpath + "\\bin\" \"" + chameleonpath + "\\bin\\K14.cmd\"";
            cmdLine += " ; new-tab -d \"" + chameleonpath + "\\bin\" \"" + chameleonpath + "\\bin\\T2.cmd\"";
            cmdLine += " ; new-tab -d \"" + simpath + "\\bin\" cmd.exe";
            //console.log(cmdLine);
            await util.exec(cmdLine);
            // wait for FC Gateway
            console.log("Waiting for FC Gateway to be ready...");
            while (!await util.isPortOpen(GW_PORT)) await util.asyncPause(500);
        } catch (err) {
            console.error("Could not start terminal window: " + err);
        }
    }

    console.log("Starting SIPbmSimulatorConfigurator.exe");
    let exeargs = [chameleonpath, gwpath, simpath, sbox.path, util.determineServerPort(servers), "false"];
    console.log(exeargs);

    util.spawnDetached(executable, exeargs, execpath);
}
