const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const open = require('opn');
const util = require('../utils/util');

function usage() {
    console.log("Usage:  tm server <cmd>");
    console.log();
    console.log("with <cmd> being one of");
    console.log();
    console.log("       list                          list configured servers.");
    console.log("       set <name> <path> [<type>]    set or update a server. type can be one of txm,rops,kko.");
    console.log("       default <name prefix/no.>     sets the current default server(s). can be a");
    console.log("                                     prefix to multiple server names to target");
    console.log("                                     multiple servers or a specific index no.");
    console.log("       del <name>                    delete a server.");
    console.log("       stop [<name pref./no.>]       stops all running servers or the specified ones.");
    console.log("       start [<name pref./no.>] [-o] (re)starts the default servers or the specified ones,");
    console.log("                                     add option '-o' to open login URL after startup.");
    console.log("       login [<name pref./no.>]      opens the default or specified servers' login page(s).");

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
    else if ("start".startsWith(cmd)) await start(args[1], args[2]);
    else if ("login".startsWith(cmd)) await login(args[1]);
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
    for (let server of Object.values(servers)) {
        let index = nameToIndex(server.name);
        console.log((server.name.startsWith(d) ? "* " : "  ") +
                     "[" + index + "]\t" +
                     "[" + server.name + "]\t" +
                     server.type + "\t" +
                     server.path + " " +
                     "(" + server.serverType + ", port " + server.port + (server.serverType=='jboss' ? ", mgmt " + server.managementPort + ", debug " + debugPortForServer(server.name) : "") + ")");
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

function indexToNameIfIndex(nameOrIndex) {
    let index;
    try { index = parseInt(nameOrIndex); } catch (e) {};
    // setting by index ?
    if (index) {
        nameOrIndex = Object.keys(global.settings.value("servers"))[index-1];
        if (!nameOrIndex) console.log("Sorry, there is no server with index no. " + index);
    }
    return nameOrIndex;
}

function nameToIndex(name) {
    let keys = Object.keys(global.settings.value("servers"));
    for (let i=0; i<keys.length; i++) {
        if (keys[i] == name) return i+1;
    }
    return 0; // not found
}

function debugPortForServer(name) {
    const BASE_DEBUG_PORT = 7777;
    return BASE_DEBUG_PORT + nameToIndex(name) - 1;
}

function def(name) {
    if (!name) usage();
    name = indexToNameIfIndex(name);
    global.settings.setValue("defaults.server", name);
    list();
}

async function stop(name) {
    let servers = global.settings.value("servers");
    if (!servers) return;
    if (name) {
        name = indexToNameIfIndex(name);
        if (!name) return;
    }
    let stoppedAJboss = false;
    for (let server of Object.values(servers)) {
        if (!name || server.name.startsWith(name)) {
            if (await util.isPortOpen(server.port)) {
                let nativeServerName = path.basename(server.path);
                console.log("Stopping server '" + server.name + "' [" + nativeServerName + "] at " + server.path);
                var win = process.platform === "win32";
                if (server.serverType == "jboss") {
                    stoppedAJboss = true;
                    await util.spawn(win ? "jboss-cli.bat" : "./jboss-cli.sh", ["--controller=localhost:"+server.managementPort, "--connect", ":shutdown"], server.path + "/../bin", "\n");
                } else if (server.serverType == "wlp") {
                    await util.spawn(win ? "server.bat" : "./server", ["stop", nativeServerName], server.path + "/../../../bin");
                }
            } else {
                console.log("Server '" + server.name + "' is not running.");
            }
        }
    }
    if (stoppedAJboss) {
        console.log("Waiting for JBoss processes to exit.");
        await util.asyncPause(5000);
    }
}

async function start(name, option) {
    if (name == '-o') {
        /* no name specified, but option -o present */
        option = name;
        name = null;
    }
    let servers = global.settings.value("servers");
    if (!servers) return;
    if (name) {
        name = indexToNameIfIndex(name);
        if (!name) return;
    }
    let d = name || global.settings.value("defaults.server");

    // stop the targeted ones that are running (restart):
    for (let server of Object.values(servers)) {
        if (server.name.startsWith(d)) {
            if (await util.isPortOpen(server.port)) await stop(server.name);
        }
    }

    // start servers:
    for (let server of Object.values(servers)) {
        if (server.name.startsWith(d)) {
            if (!await util.isPortOpen(server.port)) {
                let nativeServerName = path.basename(server.path);
                console.log("Starting server '" + server.name + "' [" + nativeServerName + "] at " + server.path);
                var win = process.platform === "win32";
                if (server.serverType == "jboss") {
                    await startJBoss(server);
                } else if (server.serverType == "wlp") {
                    await util.spawn(win ? "server.bat" : "./server", ["start", nativeServerName], server.path + "/../../../bin");
                }
            } else {
                console.log("Server '" + server.name + "' is already running.");
            }
        }
    }

    // wait for the txm type servers to be ready:
    for (let server of Object.values(servers)) {
        if (server.name.startsWith(d)) {
            if (server.type === 'txm') {
                console.log("Waiting for server '" + server.name + " to be ready.");
                await waitForServerReady(server);
            }
        }
    }

    if (option == '-o') await login(name);
}

async function login(name) {
    let servers = global.settings.value("servers");
    if (!servers) return;
    if (name) {
        name = indexToNameIfIndex(name);
        if (!name) return;
    }
    let d = name || global.settings.value("defaults.server");

    // open servers' login page(s):
    for (let server of Object.values(servers)) {
        if (server.name.startsWith(d)) {
            if (server.type === 'txm' || server.type == 'kko') {
                await openLogin(server);
            }
        }
    }
}

async function startJBoss(server) {
    let serverBaseDir = path.dirname(server.path);
    let args = [];
    args.push("-cp");
    args.push(server.path+"/../jboss-modules.jar");

    // VM options:
    args.push("-Xms512m");
    args.push("-Xmx2048m");
    args.push("-XX:MetaspaceSize=96M");
    args.push("-XX:MaxMetaspaceSize=512m");
    args.push("-Dorg.jboss.resolver.warning=true");
    args.push("-Djava.net.preferIPv4Stack=true");
    args.push("-Dsun.rmi.dgc.client.gcInterval=3600000");
    args.push("-Dsun.rmi.dgc.server.gcInterval=3600000");
    args.push("-Djboss.modules.system.pkgs=org.jboss.byteman");
    args.push("-Djava.awt.headless=true");
    args.push("-Dorg.jboss.boot.log.file="+server.path+"/log/boot.log");
    args.push("-Dlogging.configuration=file:"+server.path+"/configuration/logging.properties");
    args.push("-Djboss.home.dir="+serverBaseDir);
    args.push("-Dorg.jboss.logmanager.nocolor=true");
    args.push("-Djboss.bind.address.management=localhost");
    args.push("-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=" + debugPortForServer(server.name));

    // Server options:
    args.push("-DUMG_ENV_TYPE=nicht-prod");
    args.push("-Dcom.ibm.ws.cdi.immediate.ejb.start=true");
    args.push("-Dcom.ibm.ws.cdi.javassist.use.superclass=true");
    if (server.type == 'rops') {
        args.push("-Dpce.applicationName=txm-server-rops");
        args.push("-Dcom.myproclassic.jmsprovider=ROPS");
        args.push("-Dpce.log4j.rootPath=./logs/rops");
        args.push("-DServerTopology=FI.SB.ROPS");
    } else if (server.type == 'kko') {
        args.push("-Dpce.applicationName=txm-server-vorrechner");
        args.push("-Dpce.log4j.rootPath=./logs/kko");
        args.push("-DServerTopology=FI.SB.PCE");
    } else {
        args.push("-Dpce.applicationName=txm-server");
        args.push("-Dpce.log4j.rootPath=./logs");
        args.push("-DServerTopology=FI.SB.PCE");
    }
    args.push("-Dtxm.base.dir=.");
    args.push("-Djboss.server.base.dir="+server.path);
    // DynS path:
    let dynsPath = global.settings.value("config.DynsPropertiesPath");
    if (!dynsPath) {
        console.log("WARN DynS Properties Path not set, please set using 'tm c s DynsPropertiesPath <path>'");
    } else {
        args.push("-DDynsPropertiesPath="+dynsPath);
    }
    // Program Arguments:
    args.push("org.jboss.modules.Main");
    args.push("-mp");
    args.push(serverBaseDir+"/modules");
    args.push("org.jboss.as.standalone");
    args.push("-b");
    args.push("localhost");
    args.push("--server-config=standalone-full.xml");
    var win = process.platform === "win32";
    await util.spawnDetached(win ? "java.exe" : "java", args, server.path + "/../bin");
}

async function waitForServerReady(server) {
    let serverReady = false;
    do {
        try {
            let res = await fetch("http://localhost:"+server.port+"/rs/api/login", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: "{}"
            });
            let resdata = await res.json();
            // when we get 'IllegalArgumentException' the server is ready.
            serverReady = resdata && resdata.error && resdata.error.includes("IllegalArgumentException");
        } catch (err) {
            serverReady = false;
        }
        if (!serverReady) await util.asyncPause(1000);
    } while (!serverReady);
    console.log("Server " + server.name + " is ready.");
}

async function openLogin(server) {
    let url = "http://localhost:"+server.port+"/webadm";
    console.log("Opening " + url);
    await open(url);
}

module.exports.invoke = invoke;
module.exports.indexToNameIfIndex = indexToNameIfIndex;
