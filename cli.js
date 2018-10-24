#!/usr/bin/env node

console.log("TXM Command Line Interface v" + process.env.npm_package_version);

process.argv.forEach(arg => console.log(arg));

if (process.argv.length<3) {
    console.log("Usage:  txm <cmd>");
    console.log();
    console.log("with <cmd> being one of");
    console.log();
    console.log("       srv:     manage your servers");
    console.log("       repo:    manage your sandboxes");
    console.log("       deploy:  deploy and explode from current sandbox to current server");
}
