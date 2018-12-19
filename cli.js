#!/usr/bin/env node
const settings = require("settings-store")

const KNOWN_COMMANDS = ["version","update","server","sandbox","deploy","build","rebuild","db","cpgen","all","func","sim","ropssim","dump"];

function usage() {
    console.log("Usage:  txm <cmd>");
    console.log();
    console.log("with <cmd> being one of");
    console.log();
    console.log("       version      display version info.");
    console.log("       update       updates CLI to most recent version.");
    console.log("       server       manage your servers.");
    console.log("       sandbox      manage your sandboxes.");
    console.log("       deploy       deploy and explode EARs from the current default sandbox");
    console.log("                    to the current default server(s).");
    console.log("       build        do a gradlew build without recreating runtime folder.");
    console.log("       rebuild      do a clean build with new runtime folder.");
    console.log("       db           manage your databases.");
    console.log("       cpgen [n]    performs CPGEN import of cpg file set n (1,2).");
    console.log("       all          do everything, clean rebuild, createDB and deploy.");
    console.log("       func         manage custom function chains.");
    console.log("       sim          configures and runs the PBM simulator GUI.");
    console.log("       ropssim [ui] configures and runs ROPS gateway and ROPS cmd client,");
    console.log("                    specify argument 'ui' to start the GUI version.");
    console.log("       dump         dumps all current settings as JSON.");
    console.log();
    let defaults = global.settings.value("defaults");
    if (defaults) {
        console.log("Default server(s):  " + global.settings.value("defaults.server"));
        console.log("Default sandbox:    " + global.settings.value("defaults.sandbox"));
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
        let cli = require("./cli/" + cmd);
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
