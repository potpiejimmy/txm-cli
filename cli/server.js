const fs = require('fs');
const path = require('path');
const util = require('../utils/util');

function usage() {
    console.log("Usage:  txm server <cmd>");
    console.log();
    console.log("with <cmd> being one of");
    console.log();
    console.log("       list                         list configured servers.");
    console.log("       set <name> <path> [<type>]   set or update a server. type can be one of txm,rops,kko.");
    console.log("       default <name/prefix>        sets the current default server(s). can be a");
    console.log("                                    prefix to multiple server names to target");
    console.log("                                    multiple servers.");
    console.log("       del <name>                   delete a server.");
    console.log("       stop [<name/prefix>]         stops all running servers or the specified ones");

    process.exit();
}

async function invoke(args) {

    if (!args.length) usage();

    let cmd = args[0];
    if ("list".startsWith(cmd)) list();
    else if ("set".startsWith(cmd)) set(args[1], args[2], args[3]);
    else if ("default".startsWith(cmd)) def(args[1]);
    else if ("del".startsWith(cmd)) del(args[1]);
    else if ("stop".startsWith(cmd)) await stop(args[1]);
    else {
        console.log("Unknown command: " + cmd);
        usage();
    }
}

function list() {
    let servers = global.settings.value("servers");
    if (!servers) {
        console.log("No servers configured");
        return;
    }
    let d = global.settings.value("defaults.server");
    for (let key of Object.keys(servers)) {
        let server = servers[key];
        console.log((server.name.startsWith(d) ? "* " : "  ") +
                     "[" + server.name + "]\t" +
                     server.type + "\t" +
                     server.path + " " +
                     "(" + server.serverType + ", port " + server.port + (server.serverType=='jboss' ? ", mgmt " + server.managementPort : "") + ")");
    }
    console.log();
    console.log("* = current default server(s) / deploy target(s)");
}

function set(name, path, type='txm') {
    if (!name || !path) usage();
    if (!['txm','rops','kko'].includes(type)) usage();
    if (!name.match(/^[A-Za-z0-9-_]*$/)) {
        console.log("Sorry, the name '"+name+"' contains invalid characters.");
        return;
    }
    let server = determineServerType(path);
    if (!server) {
        console.log("Unknown server type at " + path);
        console.log("Please specify a valid JBoss or WLP server folder (e.g. the standalone dir of a JBoss)");
        return;
    }
    server.name = name;
    server.path = path;
    server.type = type;
    global.settings.setValue("servers."+name, server);
    let d = global.settings.value("defaults.server");
    if (!d || !name.startsWith(d)) def(name); // make default if not already targeted
    else list();
}

function determineServerType(path) {
    if (fs.existsSync(path+"/deployments")) {
        let serverCfg = fs.readFileSync(path+"/configuration/standalone-full.xml");
        let port = /{jboss.http.port:(\d*)/.exec(serverCfg);
        let managementPort = /{jboss.management.http.port:(\d*)/.exec(serverCfg);
        return {
            serverType: "jboss",
            port: parseInt(port[1]),
            managementPort: parseInt(managementPort[1])
        };
    } else if (fs.existsSync(path+"/dropins")) {
        let serverCfg = fs.readFileSync(path+"/server.xml");
        let port = /httpPort="(\d*)"/.exec(serverCfg);
        return {
            serverType: "wlp",
            port: parseInt(port[1])
        };
    }
}

function del(name) {
    if (!name) usage();
    global.settings.delete("servers." + name);
    list();
}

function def(name) {
    if (!name) usage();
    global.settings.setValue("defaults.server", name);
    list();
}

async function stop(name) {
    let servers = global.settings.value("servers");
    if (!servers) return;
    for (let key of Object.keys(servers)) {
        let server = servers[key];
        if (!name || server.name.startsWith(name)) {
            let nativeServerName = path.basename(server.path);
            console.log("Stopping server '" + nativeServerName + "' at " + server.path);
            if (server.serverType == "jboss") {
                await util.spawn("jboss-cli.bat", ["--controller=localhost:"+server.managementPort, "--connect", ":shutdown"], server.path + "/../bin");
            } else if (server.serverType == "wlp") {
                await util.spawn("server.bat", ["stop", nativeServerName], server.path + "/../../../bin");
            }
        }
    }
}

module.exports.invoke = invoke;
