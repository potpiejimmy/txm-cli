function usage() {
    console.log("Usage:  txm server <cmd>");
    console.log();
    console.log("with <cmd> being one of");
    console.log();
    console.log("       list:                list configured servers");
    console.log("       set <name> <path>:   set or update a server");
    console.log("       del <name>:          delete a server");
    console.log("       default <name>:      sets the current default server");
    
    process.exit();
}

function invoke(args) {

    if (!args.length) usage();

    let cmd = args[0];
    if (cmd === "list") list();
    else if (cmd === "set") set(args[1], args[2]);
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
        console.log((servers[key].name==d ? "* " : "  ") + "[" + servers[key].name + "]:\t" + servers[key].path);
    })
}

function set(name, path) {
    if (!name || !path) usage();
    global.settings.setValue("servers."+name, {name:name, path:path});
    def(name); // make default
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
