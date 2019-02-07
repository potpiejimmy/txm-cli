const fs = require('fs');
const util = require('../utils/util');
const propreader = require('properties-reader');

function usage() {
    console.log("Usage:  tm db <cmd>");
    console.log();
    console.log("with <cmd> being one of");
    console.log();
    console.log("       set <user> <pw>    sets current DB user and password.");
    console.log("       create             (re)creates the database schema (runs createDb.sh).");
    console.log("       norops             disables ROPS (executes disable-rops.sql).");
    console.log("       devinit            initializes dev system (executes devsystem_init.sql).");
    console.log();
    showCurrentSettings();
    
    process.exit();
}

async function invoke(args) {
    if (!args.length) usage();

    let cmd = args[0];
    if ("create".startsWith(cmd)) await createDB();
    else if ("set".startsWith(cmd)) await configureDB(args[1], args[2]);
    else if ("norops".startsWith(cmd)) await executeSQL("disable-rops.sql");
    else if ("devinit".startsWith(cmd)) await executeSQL("devsystem_init.sql");
    else {
        console.log("Unknown command: " + cmd);
        usage();
    }
}

function getGradlePropertiesFile() {
    return require('os').homedir() + "/.gradle/gradle.properties";
}

function showCurrentSettings() {
    console.log("Current DB: " + getDBConnectionString());
}

function getDBConnectionString() {
    let dbprops = propreader(getGradlePropertiesFile());
    return dbprops.get("dbUser") + "/" + dbprops.get("dbPW") + "@XE";
}

async function createDB() {
    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    if (!sbox) {
        console.log("Please configure a sandbox first.");
        return;
    }
    console.log("Running createDb.sh");
    await util.exec("createDb.sh", sbox.path+"/scripts");
}

async function configureDB(user, pw) {
    if (!user || !pw) usage();
    let cfgFile = getGradlePropertiesFile();
    let cfg = fs.readFileSync(cfgFile).toString();
    cfg = cfg.replace(/^dbUser=.*$/m, "dbUser=" + user);
    cfg = cfg.replace(/^dbPW=.*$/m, "dbPW=" + pw);
    fs.writeFileSync(cfgFile, cfg);
    showCurrentSettings();
}

async function executeSQL(script) {
    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    var win = process.platform === "win32";
    await util.spawn(win ? "sqlplus.exe" : "sqlplus", [getDBConnectionString(), "@"+script], sbox.path+"/fi-asm-assembly/install/sql", "quit\n");
}

module.exports.invoke = invoke;
