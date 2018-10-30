const util = require('../utils/util');
const fs = require('fs');

function usage() {
    console.log("Usage:  txm cpgen [<cpgset>]");
    console.log();
    console.log("<cpgset> can be either '1' for HG0 import or '2' for HG1 import. Default is '1'.");

    process.exit();
}

async function invoke(args) {
    
    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));

    configurePort(sbox);
    startStopServiceStation(sbox, false);

    await util.asyncPause(5000); // wait 5 sec.

    if (!args[0] || args[0] === '1') {
        copyCpgFile("/fi-servicestation-client/etc/import", "R1400.cpg");
        copyCpgFile("/Projects/SI/Server/ServiceStation/testsrc/testfiles_daten.neu/kko", "R3768_links.cpg");
    } else if (args[0] === '2') {
        copyCpgFile("/Projects/SI/Server/ServiceStation/testsrc/testfiles_daten.neu/kko", "R3769_rechts.cpg");
    }

    await waitImportDirEmpty(sbox);
    await startStopServiceStation(sbox, true);
}

function configurePort(sbox) {
    let servers = global.settings.value("servers");
    let cfgFile = sbox.path + "/runtime/fi-servicestation-client/config/serviceStation.properties";
    let cfg = fs.readFileSync(cfgFile);
    cfg = cfg.toString().replace(/^java.naming.provider.url=.*$/m, "java.naming.provider.url=http://localhost:" + util.determineServerPort(servers));
    fs.writeFileSync(cfgFile, cfg);
}

async function startStopServiceStation(sbox, stop) {
    var win = process.platform === "win32";
    let bindir = sbox.path+"/runtime/fi-servicestation-client/bin";
    return util.spawn(bindir + "/" + (stop ? "stop" : "start") + "ServiceStation." + (win ? "cmd" : "sh"), [], bindir);
}

async function waitImportDirEmpty(sbox) {
    let importDir = sbox.path + "/runtime/fi-servicestation-client/import";
    let foundFile;
    do {
        await util.asyncPause(2000);
        let dirc = fs.readdirSync(importDir);
        foundFile = false;
        for (let entry of dirc) if (entry !== 'importhistory') foundFile = true;
    } while (foundFile);
}

function copyCpgFile(srcdir, cpgfile) {
    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    srcdir = sbox.path + srcdir;
    let targetdir = sbox.path+"/runtime/fi-servicestation-client/import";
    console.log("Copying " + srcdir + "/" + cpgfile + " to " + targetdir);
    fs.copyFileSync(srcdir + "/" + cpgfile,
                    targetdir + "/" + cpgfile);
}

module.exports.invoke = invoke;
