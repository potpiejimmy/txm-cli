#!/usr/bin/env node
const settings = require("settings-store")

function usage() {
    console.log("TXM Command Line Interface v" + require('./package.json').version);
    console.log();
    console.log("Usage:  txm <cmd>");
    console.log();
    console.log("with <cmd> being one of");
    console.log();
    console.log("       server:     manage your servers");
    console.log("       sandbox:    manage your sandboxes");
    console.log("       deploy:     deploy and explode from current sandbox to current server");
    console.log();
    let defaults = global.settings.value("defaults");
    if (defaults) console.log("Defaults: " + JSON.stringify(defaults, null, 2));
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
