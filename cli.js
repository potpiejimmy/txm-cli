#!/usr/bin/env node
import settings from "settings-store";
import * as db from './cli/db.js';

const KNOWN_COMMANDS = ["version","update","server","sandbox","config","deploy","build", "changelog","rebuild","hotfix","db","cpgen","all","func","sim","ropssim","lastbn","latestbuild","autotest","dump", "ctv","logs"];

function usage() {
    console.log("Usage:  tm <cmd>");
    console.log();
    console.log("with <cmd> being one of");
    console.log();
    console.log("       version        display version info.");
    console.log("       update         update CLI to most recent version.");
    console.log("       server         manage your servers.");
    console.log("       sandbox        manage your sandboxes.");
    console.log("       config         manage general configuration settings.");
    console.log("       deploy         deploy and explode EARs from the current default sandbox");
    console.log("                      to the current default server(s).");
    console.log("       build          do a gradlew build without recreating runtime folder.");
    console.log("       rebuild        do a clean build with new runtime folder.");
    console.log("       hotfix         apply hotfix from IDE to deployed server(s).");
    console.log("       db             manage your databases.");
    console.log("       cpgen          perform CPGEN imports of cpg files.");
    console.log("       all            do everything, clean rebuild, createDB and deploy.");
    console.log("       func           manage custom function chains.");
    console.log("       sim            configure and run the PBM simulator GUI.");
    console.log("       ropssim [ui]   configure and run ROPS gateway and ROPS cmd client,");
    console.log("                      specify option 'ui' to start the GUI version.");
    console.log("       lastbn [<r> [<b> [d]]] display last build number (and copy to clipboard),");
    console.log("                      with <r> being the desired version (e.g. '19.0.00'),");
    console.log("                      if <r> is omitted, the current sandbox version is used,");
    console.log("                      <b> is required branch. If ommited, master will be used");
    console.log("                      specify option 'd' to download the artifact from Nexus.");
    console.log("       latestbuild <branch> <dep> <ver> displays latest product build number")
    console.log("                      more info in command usage ;)")
    console.log("       changelog <branch> <dep> <ver> shows you all the changelog entries for");
    console.log("                      your selected branch, artifact and version.")
    console.log("       autotest       run the automated test suite (Automatiktest).");
    console.log("       dump           dump all current settings as JSON.");
	console.log("       ctv            run commtraceviewer.");
	console.log("       logs           opens all relevant log files in LogExpert (win) or tail (ux).");
    console.log();
    console.log("All commands can be abbreviated, for instance 'l' for 'lastbn'.");
    console.log();
    let defaults = global.settings.value("defaults");
    if (defaults) {
        console.log("Default server(s):  " + global.settings.value("defaults.server"));
        console.log("Default sandbox:    " + global.settings.value("defaults.sandbox"));
        console.log("Current DB User:    " + db.getDBConnectionString());
    }
    process.exit();
}

// load settings:
settings.init({
    appName:       "txm-cli", //required,
    publisherName: "Diebold Nixdorf", //optional
    reverseDNS:    "com.dieboldnixdorf.txm" //required for macOS
});

global.settings = settings;

if (process.argv.length<3) usage();

// now start the actual sub command program:
let cmd = process.argv[2];

async function callCli(cmd, args) {

    // allow abbreviation of all commands:
    for (let c of KNOWN_COMMANDS) {
        if (c.startsWith(cmd)) cmd = c;
    }

    if (!KNOWN_COMMANDS.includes(cmd)) {
        console.log("Unknown command: " + cmd);
        usage();
    }

    try {
        const cli = await import("./cli/" + cmd + ".js");
        await cli.invoke(args);
    } catch (err) {
        console.log(err);
    }
}

async function callCliAndExit(cmd, args) {
    await callCli(cmd, args);
    process.exit();
}

// make callCli available for function chains (func.js):
global.callCli = callCli;

// call the CLI command:
callCliAndExit(cmd, process.argv.slice(3));
