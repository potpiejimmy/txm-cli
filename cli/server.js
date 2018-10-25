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
    if (cmd === "list") list();
    else if (cmd === "set") set(args[1], args[2], args[3]);
    else if (cmd === "del") del(args[1]);
    else if (cmd === "default") def(args[1]);
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
                     (servers[key].type+" ").substr(0,4) + "\t" +
                     servers[key].path);
    })
    console.log();
    console.log("*=current default server(s) / deploy target(s)");
}

function set(name, path, type='txm') {
    if (!name || !path) usage();
    if (!['txm','rops','kko'].includes(type)) usage();
    global.settings.setValue("servers."+name, {name:name, path:path, type:type});
    let d = global.settings.value("defaults.server");
    if (!d || !name.startsWith(d)) def(name); // make default if not already targeted
    else list();
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
