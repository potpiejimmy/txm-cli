#!/usr/bin/env node
const settings = require("settings-store")

const KNOWN_COMMANDS = ["version","update","server","sandbox","deploy","build","rebuild","db","cpgen","all","sim","dump"];

function usage() {
    console.log("Usage:  txm <cmd>");
    console.log();
    console.log("with <cmd> being one of");
    console.log();
    console.log("       version    display version info.");
    console.log("       update     updates CLI to most recent version.");
    console.log("       server     manage your servers.");
    console.log("       sandbox    manage your sandboxes.");
    console.log("       deploy     deploy and explode EARs from the current default sandbox");
    console.log("                  to the current default server(s).");
    console.log("       build      do a gradlew build without recreating runtime folder.");
    console.log("       rebuild    do a clean build with new runtime folder.");
    console.log("       db         recreate DB schema.");
    console.log("       cpgen [n]  performs CPGEN import of cpg file set n (1,2).");
    console.log("       all        do everything, clean rebuild, createDB and deploy.");
    console.log("       sim        configures and runs the PBM simulator GUI.");
    console.log("       dump       dumps all current settings as JSON.");
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

// allow abbreviation of all commands:
for (let c of KNOWN_COMMANDS) {
    if (c.startsWith(cmd)) cmd = c;
}

if (!KNOWN_COMMANDS.includes(cmd)) {
    console.log("Unknown command: " + cmd);
    usage();
}

callCli(cmd);

async function callCli(cmd) {
    try {
        let cli = require("./cli/" + cmd);
        await cli.invoke(process.argv.slice(3));
    } catch (err) {
        console.log(err);
    }
    process.exit();
}
