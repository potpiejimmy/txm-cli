function usage() {
    console.log("Usage:  tm sandbox <cmd>");
    console.log();
    console.log("with <cmd> being one of");
    console.log();
    console.log("       list                list configured sandboxes.");
    console.log("       set <name> <path>   set or update a sandbox.");
    console.log("       del <name>          delete a sandbox.");
    console.log("       default <name>      sets the current default sandbox.");
    
    process.exit();
}

export function invoke(args) {

    if (!args.length) usage();

    let cmd = args[0];
    if ("list".startsWith(cmd)) list();
    else if ("set".startsWith(cmd)) set(args[1], args[2]);
    else if ("default".startsWith(cmd)) def(args[1]);
    else if ("del".startsWith(cmd)) del(args[1]);
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
    for (let sandbox of Object.values(sandboxes)) {
        console.log((sandbox.name==d ? "* " : "  ") + "[" + sandbox.name + "]\t" + sandbox.path);
    }
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
