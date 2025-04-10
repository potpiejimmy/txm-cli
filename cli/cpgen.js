import * as util from '../utils/util.js';
import fs from 'fs';
import path from 'path';

function usage() {
    console.log("Usage:  tm cpgen 1|2|<file1> [<file2> [<file3> ...]]");
    console.log();
    console.log("  Argument can be either '1' for default HG0 import or '2' for HG1 import,");
    console.log("  or you can specify any number of absolute file paths to be imported.");
    console.log();
    console.log("  Timestamp postfixes in filenames are automatically stripped. For instance, the");
    console.log("  command 'tm cpg C:\\tmp\\R1495.cpg_20181219_231349' will import the file 'R1495.cpg'.");

    process.exit();
}

export async function invoke(args) {
    
    if (!args[0]) usage();

    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));

    configurePort(sbox);

    // copy a file to wait for it to be removed by servicestation startup
    copyCpgFile("/fi-servicestation-client/etc/import", "R1400.cpg");

    startStopServiceStation(sbox, false);
    await waitImportDirEmpty(sbox); // wait for service station to be up and running

    // now copy the files
    if (args[0] === '1') {
        copyCpgFile("/fi-servicestation-client/etc/import", "R1400.cpg");
        copyCpgFile("/fi-servicestation-client/cpgenfiles/testfiles_daten.neu/kko", "R3768_links.cpg");
    } else if (args[0] === '2') {
        copyCpgFile("/fi-servicestation-client/cpgenfiles/testfiles_daten.neu/kko", "R3769_rechts.cpg");
    } else {
        for (let f of args) copyCpgFileAbsolute(f);
    }

    // wait for import to be finished
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
    copyCpgFileImpl(sbox, srcdir + "/" + cpgfile, cpgfile);
}

function copyCpgFileAbsolute(cpgfilepath) {
    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    let targetname = path.basename(cpgfilepath);
    if (targetname.indexOf(".cpg")>0) targetname = targetname.substr(0, targetname.indexOf(".cpg")+4);
    if (targetname.indexOf(".tab")>0) targetname = targetname.substr(0, targetname.indexOf(".tab")+4);
    copyCpgFileImpl(sbox, cpgfilepath, targetname);
}

function copyCpgFileImpl(sbox, srcfile, targetname) {
    let targetdir = sbox.path+"/runtime/fi-servicestation-client/import";
    console.log("Copying " + srcfile + " to " + targetdir + "/" + targetname);
    try {
        fs.copyFileSync(srcfile,
                        targetdir + "/" + targetname);
    } catch (e) {
        console.error("Copy failed: " + e);
    }
}
