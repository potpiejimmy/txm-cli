#!/usr/bin/env node
const settings = require("settings-store")

const KNOWN_COMMANDS = ["version","update","server","sandbox","deploy","build","rebuild","cpgen","all","sim"];

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
    console.log("       cpgen      performs CPGEN import (beta).");
    console.log("       all        do everything, clean rebuild, createDB and deploy.");
    console.log("       sim        configures and runs the PBM simulator GUI.");
    console.log();
    let defaults = global.settings.value("defaults");
    if (defaults) console.log("Current defaults:\n" + JSON.stringify(defaults, null, 2));
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
