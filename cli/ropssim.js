const util = require('../utils/util');
const fs = require('fs');

async function invoke(args) {
    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    let servers = global.settings.value("servers");
    if (!sbox || !servers) {
        console.log("Please configure default sandbox and server(s) first.");
        return;
    }
    // configure gateway:
    configurePort(sbox);

    // spawn gateway:
    var win = process.platform === "win32";
    util.spawn(win ? "startRopsGateway.cmd" : "startROPSGateway.sh", [], sbox.path + "/runtime/fi-rops-gateway/bin");

    // wait until GW running:
    while (!await util.isPortOpen(5160)) await util.asyncPause(500);

    //util.spawn("", exeargs, execpath);
    console.log("ROPS gateway is running");
		
	if(args[0] === "gui")
	{
		await util.spawn(win ? "fi-rops-sim-client2.bat" : "fi-rops-sim-client2", [], sbox.path + "/runtime/fi-rops-sim-client2/bin");
		console.log("Rops gui is running. Cli blocked until you close the window.");
	}
	else
	{
		await util.spawn("java", [
			"com.myproclassic.si.rops.simclient.simClient",
			"R3768T07", "localhost",
			"5160",
			"127.000.000.001",
			"12345"], 
			sbox.path + "/fi-rops-sim-client/build/classes/java/main");
	}

    // stopping gateway:
    console.log("Stopping ROPS gateway...");
    await util.spawn(win ? "stopRopsGateway.cmd" : "stopROPSGateway.sh", [], sbox.path + "/runtime/fi-rops-gateway/bin");
    
    // wait until GW stopped:
    while (await util.isPortOpen(5160)) await util.asyncPause(500);
    console.log("ROPS gateway stopped.");
}

function configurePort(sbox) {
    let servers = global.settings.value("servers");
    let cfgFile = sbox.path + "/runtime/fi-rops-gateway/config/SIROPSGateway.xml";
    let cfg = fs.readFileSync(cfgFile);
    cfg = cfg.toString().replace(/"ServerUrl">.*$/gm, "\"ServerUrl\">http://localhost:" + util.determineServerPort(servers,'rops') + "</sectionEntry>");
    fs.writeFileSync(cfgFile, cfg);
}

module.exports.invoke = invoke;
