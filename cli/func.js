function usage() {
    console.log("Usage:  tm func <cmd>");
    console.log();
    console.log("with <cmd> being one of");
    console.log();
    console.log("       <name>                execute function chain with the given name.");
    console.log("       <name> <definition>   define/update a function chain definition,");
    console.log("                             use colon (:) to separate the commands.");
    console.log();
    console.log("Example:");
    console.log();
    console.log("To define a function chain named 'f1' that executes the following chain of");
    console.log("commands: 'tm build', 'tm server def hg0', 'tm deploy', use the following");
    console.log("command:");
    console.log();
    console.log("       tm func f1 \"b:s def hg0:dep\"");
    console.log();
    console.log("Tip: Use \" \" as chain definition to delete a function chain.");
    console.log();
    console.log("Your function chains:");
    console.log();
    list();
    
    process.exit();
}

export async function invoke(args) {

    if (!args.length) usage();

    let name = args[0];
    let def = args[1];
    if (!def) await execute(name);
    else set(name, def);
}

function list() {
    let functions = global.settings.value("functions");
    if (!functions) {
        console.log("No functions configured");
        return;
    } 
    for (let f of Object.values(functions)) {
        console.log("[" + f.name + "]\t" + f.definition);
    }
}

function set(name, def) {
    if (!def.trim().length) {
        global.settings.delete("functions."+name);
    } else {
        global.settings.setValue("functions."+name, {name:name, definition:def});
    }
    list();
}

async function execute(name) {
    let def = global.settings.value("functions."+name);
    if (!def || !def.definition) {
        console.log("Unknown function chain: " + name);
        return;
    }
    let cmds = def.definition.split(":");
    console.log("Executing function chain " + cmds);
    for (let i=0; i<cmds.length; i++) {
        let f= cmds[i];
        console.log("---- Executing "+(i+1)+"/"+cmds.length+": " + f + " ----");
        let args = f.split(" ");
        await global.callCli(args[0],args.slice(1));
    }
}
