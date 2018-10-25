function usage() {
    console.log("Usage:  txm sandbox <cmd>");
    console.log();
    console.log("with <cmd> being one of");
    console.log();
    console.log("       list                list configured sandboxes.");
    console.log("       set <name> <path>   set or update a sandbox.");
    console.log("       del <name>          delete a sandbox.");
    console.log("       default <name>      sets the current default sandbox.");
    
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
    let sandboxes = global.settings.value("sandboxes");
    if (!sandboxes) {
        console.log("No sandboxes configured");
        return;
    } 
    let d = global.settings.value("defaults.sandbox");
    Object.keys(sandboxes).forEach(key => {
        console.log((sandboxes[key].name==d ? "* " : "  ") + "[" + sandboxes[key].name + "]\t" + sandboxes[key].path);
    })
    console.log();
    console.log("* = current default sandbox");
}

function set(name, path) {
    if (!name || !path) usage();
    global.settings.setValue("sandboxes."+name, {name:name, path:path});
    def(name); // make default
}

function del(name) {
    if (!name) usage();
    global.settings.delete("sandboxes." + name);
    list();
}

function def(name) {
    if (!name) usage();
    global.settings.setValue("defaults.sandbox", name);
    list();
}

module.exports.invoke = invoke;
