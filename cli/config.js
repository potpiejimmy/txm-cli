function usage() {
    console.log("Usage:  tm config <cmd>");
    console.log();
    console.log("with <cmd> being one of");
    console.log();
    console.log("       list                list all settings.");
    console.log("       set <key> <value>   set/update a setting.");
    console.log("       get <key>           get a setting value.");
    console.log("       del <key>           delete a setting.");
    
    process.exit();
}

export function invoke(args) {

    if (!args.length) usage();

    let cmd = args[0];
    if ("list".startsWith(cmd)) list();
    else if ("set".startsWith(cmd)) set(args[1], args[2]);
    else if ("get".startsWith(cmd)) get(args[1]);
    else if ("del".startsWith(cmd)) del(args[1]);
    else {
        console.log("Unknown command: " + cmd);
        usage();
    }
}

function list() {
    let cfg = global.settings.value("config");
    if (!cfg) {
        console.log("No settings configured");
        return;
    } 
    for (let k of Object.keys(cfg)) {
        console.log(k + " = " + cfg[k]);
    }
}

function set(k, v) {
    if (!k || !v) usage();
    global.settings.setValue("config."+k, v);
}

function del(k) {
    if (!k) usage();
    global.settings.delete("config."+k);
}

function get(k) {
    if (!k) usage();
    console.log(global.settings.value("config."+k));
}
