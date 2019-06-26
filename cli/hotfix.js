const util = require('../utils/util');
const fs = require('fs');
const path = require('path');
const server = require('./server');
const deploy = require('./deploy');

function usage() {
    console.log("Usage:  tm hotfix <module>");
    console.log();
    console.log("  Stops the targeted server(s), explodes the given module in the deployment folders,");
    console.log("  applies the IDE-compiled classes from <module>/out/production/classes on top of");
    console.log("  it, restarts the server(s).");
    console.log();
    console.log("  <module> specifies the Gradle subproject name, i.e. the JAR file base name.");

    process.exit();
}

async function invoke(args) {
    
    if (args.length != 1) usage();

    let modulename = args[0];
    let defserver = global.settings.value("defaults.server");

    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));

    await server.invoke(["stop", defserver]);

    console.log("Hotfixing the servers " + defserver + "*");
    let servers = global.settings.value("servers");
    for (let server of Object.values(servers)) {
        if (server.name.startsWith(defserver)) {
            console.log("-----");
            let deploymentmodule = modulename;
            if (deploymentmodule.startsWith('fi-asm-') && deploymentmodule.endsWith('-patch')) {
                // patch project:
                deploymentmodule = deploymentmodule.substr('fi-asm-'.length, deploymentmodule.length - 'fi-asm--patch'.length);
            }
            let isWar = deploymentmodule.endsWith("webapp");
            let modulepath = deploy.getDeploymentPath(server) + '/' + deploymentmodule + (isWar ? '.war' : '.jar');
            if (fs.existsSync(modulepath)) {
                if (fs.lstatSync(modulepath).isFile()) {
                    util.unjar(modulepath); // unjar if it exists as a file
                }
                if (fs.lstatSync(modulepath).isDirectory()) {
                    let fixpath = modulepath;
                    if (isWar) fixpath += '/WEB-INF/classes';
                    console.log("Hotfixing " + fixpath);
                    await util.copytree(sbox.path + '/' + modulename + '/out/production/classes/', fixpath);
                }
            } else {
                console.log("Module '" + deploymentmodule + "' does not exist on server '" + server.name + "'");
            }
        }
    };
    console.log("-----");

    await server.invoke(["start", defserver]);
}

module.exports.invoke = invoke;
