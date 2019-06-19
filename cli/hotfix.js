const util = require('../utils/util');
const fs = require('fs');
const path = require('path');
const server = require('./server');
const deploy = require('./deploy');

function usage() {
    console.log("Usage:  tm hotfix <server> <module>");
    console.log();
    console.log("  Stops the given server(s), explodes the given module in the deployment folder,");
    console.log("  applies the IDE-compiled classes from <module>/out/production/classes on top of");
    console.log("  it, restarts the server(s).");
    console.log();
    console.log("  <server> needs to denote a server name/prefix or index as per 'tm server list'.");
    console.log("  <module> specifies the module folder name which is also the JAR file base name.");

    process.exit();
}

async function invoke(args) {
    
    if (args.length != 2) usage();

    let servername = args[0];
    let modulename = args[1];

    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));

    await server.invoke(["stop",servername]);

    servername = server.indexToNameIfIndex(servername); // allow index
    let servers = global.settings.value("servers");
    for (let server of Object.values(servers)) {
        if (server.name.startsWith(servername)) {
            console.log("-----");
            let modulepath = deploy.getDeploymentPath(server) + '/' + modulename + '.jar';
            if (fs.lstatSync(modulepath).isFile()) {
                util.unjar(modulepath); // unjar if it exists as a file
            }
            if (fs.lstatSync(modulepath).isDirectory()) {
                console.log("Hotfixing " + modulepath);
                await util.copytree(sbox.path + '/' + modulename + '/out/production/classes/', modulepath);
            }
        }
    };

    await server.invoke(["start",servername]);
}

module.exports.invoke = invoke;
