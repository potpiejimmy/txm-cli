import * as util from '../utils/util.js';
import fs from 'fs';
import * as server from './server.js';
import * as deploy from './deploy.js';

function usage() {
    console.log("Usage:  tm hotfix <module>");
    console.log();
    console.log("  Stops the targeted server(s), explodes the given module in the deployment folders,");
    console.log("  applies the IDE-compiled classes from <module>/out/production/classes on top of");
    console.log("  it, restarts the server(s).");
    console.log();
    console.log("  Note: You need to configure your Build Tools Gradle settings in the IDE to build using");
    console.log("        'IntelliJ IDEA' instead of 'Gradle (default)'.");
    console.log();
    console.log("  <module> specifies the Gradle subproject name, i.e. the JAR file base name.");

    process.exit();
}

export async function invoke(args) {
    
    if (args.length != 1) usage();

    let modulename = args[0];
    let defserver = global.settings.value("defaults.server");

    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    let sandboxVersion = util.determineSandboxVersion(sbox);

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
            let isWar = deploymentmodule.endsWith("-webapp");
            let isWf = deploymentmodule.endsWith("-wf");
            let isNotEjb = !deploymentmodule.endsWith("-ejb");
            let modulepath = deploy.getDeploymentPath(server) + '/' + deploymentmodule + (isWar ? '.war' : '.jar'); // EAR root folder
            if (isNotEjb) modulepath = deploy.getDeploymentPath(server) + '/lib/' + deploymentmodule + '-' + sandboxVersion + '-SNAPSHOT.jar'; // EAR lib folder
            if (isWf) modulepath = deploy.getDeploymentPath(server) + '/ocm.war/WEB-INF/lib/' + deploymentmodule + '.jar'; // OCM war lib folder
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
