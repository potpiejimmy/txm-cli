const fs = require('fs');

function usage() {
    console.log("Usage:  txm server <cmd>");
    console.log();
    console.log("with <cmd> being one of");
    console.log();
    console.log("       list                         list configured servers.");
    console.log("       set <name> <path> [<type>]   set or update a server. type can be one of txm,rops,kko.");
    console.log("       del <name>                   delete a server.");
    console.log("       default <name/prefix>        sets the current default server(s). can be a");
    console.log("                                    prefix to multiple server names to target");
    console.log("                                    multiple servers.");

    process.exit();
}

function invoke(args) {

    if (!args.length) usage();

    let cmd = args[0];
    if ("list".startsWith(cmd)) list();
    else if ("set".startsWith(cmd)) set(args[1], args[2], args[3]);
    else if ("default".startsWith(cmd)) def(args[1]);
    else if ("del".startsWith(cmd)) del(args[1]);
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
    Object.keys(servers).forEach(key => {
        console.log((servers[key].name.startsWith(d) ? "* " : "  ") +
                     "[" + servers[key].name + "]\t" +
                     servers[key].type + "\t" +
                     servers[key].path + " " +
                     "(" + servers[key].serverType + ", port " + servers[key].port + ")");
    })
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
        return {
            serverType: "jboss",
            port: parseInt(port[1])
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

module.exports.invoke = invoke;
