import fs from 'node:fs';
import * as util from '../utils/util.js';
import propreader from 'properties-reader';
import os from 'node:os';
import process from "node:process";

const PARAM_USE_PROJECT_CONFIGURATION = "db.useSandboxConfiguration";


function usage() {
    console.log("Usage:  tm db <cmd>");
    console.log();
    console.log("with <cmd> being one of");
    console.log();
    console.log("       init                      initializes Oracle DBMS with FI tablespaces and grants.");
    console.log("       adduser <user> <pw>       (re)creates a new Oracle user with the given user name and password.");
    console.log("       set <user> <pw> [<sid>]   sets the current default DB user, password and SID (optional)");
    console.log("       create                    (re)creates the FI database DDLs & DMLs (runs createDb.sh).");
    console.log("       norops                    disables ROPS (executes disable-rops.sql).");
    console.log("       devinit                   initializes dev system (executes devsystem_init.sql).");
    console.log("       fix                       fixes Oracle connection problem by running 'startup' as sysdba.");
    console.log("       use-sandbox-configuration false (default): use user specific gradle.properties file for db actions");
    console.log("                                 true: use project specific gradle.propertied file for db actions")
    console.log("                                 empty: return to the default configuration")
    console.log();
    showCurrentSettings();

    process.exit();
}

export async function invoke(args) {
    if (!args.length) usage();

    let cmd = args[0];
    if ("init".startsWith(cmd)) await initDBMS();
    else if ("adduser".startsWith(cmd)) await createSchema(args[1], args[2]);
    else if ("set".startsWith(cmd)) await configureDB(args[1], args[2], args[3]);
    else if ("create".startsWith(cmd)) await createDB();
    else if ("norops".startsWith(cmd)) await executeSQL("disable-rops.sql");
    else if ("devinit".startsWith(cmd)) await executeSQL("devsystem_init.sql");
    else if ("fix".startsWith(cmd)) await fixOracleListener();
    else if ("use-sandbox-configuration".startsWith(cmd)) await configureConfigFile(args[1]);
    else {
        console.log("Unknown command: " + cmd);
        usage();
    }
}

function getGradlePropertiesFile() {
    const filename = "/gradle.properties";

    let filePath;

    if (getUseProjectSpecificConfiguration()) {
        let sandbox = globalThis.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
        filePath = sandbox.path;

    } else if ("GRADLE_USER_HOME" in process.env) {
        filePath = process.env.GRADLE_USER_HOME;
    } else {
        filePath = os.homedir() + "/.gradle";
    }
    return (filePath + filename).replaceAll("\\", "/");
}

function showCurrentSettings() {
    console.log("Current DB: " + getDBConnectionString());
}

export function getDBConnectionString() {
    try {
        let dbprops = propreader(getGradlePropertiesFile());
        return getDbUser() + "/" + dbprops.get("dbPW") + "@"+getDbConnectionFromGradle()+"/"+getSID();
    } catch(err) {
        return err.toString();
    }
}

function getDbUser(){
    let dbprops = propreader(getGradlePropertiesFile());
    return dbprops.get("dbUser");
}

function getSID() {
    let dbprops = propreader(getGradlePropertiesFile());
    let dbName = dbprops.get("dbName");
    let sid = "XE";
    try {
        sid = dbName.includes('.') ? dbName.split('.')[0] : dbName;
    } catch(err) {
        console.log("err reading SID. Using default: XE")
        sid = "XE";
    }

    return sid.toUpperCase();
}

function getDbConnectionFromGradle(){
    let dbprops = propreader(getGradlePropertiesFile());
    let dbConn = dbprops.get("dbConnection");
    let dbPort = dbprops.get("dbPort");
    if (!dbConn) {
        console.log("No dbConnection found in gradle.properties. Using default: 127.0.0.1");
        dbConn = "127.0.0.1";
    }
    if(!dbPort){
        console.log("No dbPort found in gradle.properties. Using default: 1521");
        dbPort = "1521";
    }
    return dbConn+":"+dbPort;
}

function convertSidToGradleDbName(sid) {
    let dbprops = propreader(getGradlePropertiesFile());
    let dbName = dbprops.get("dbName");
    let newDbName = "xe.ad.diebold.com";
    try {
        if(dbName && dbName.includes('.'))
            newDbName = sid + dbName.substring(dbName.indexOf('.'), dbName.length)
        else
            newDbName = sid;
    } catch(err) {
        console.log("err changing sid. setting default in gradle properties: xe.ad.diebold.com")
        newDbName = "xe.ad.diebold.com"
    }

    return newDbName;
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

async function configureDB(user, pw, sid) {
    if (!user || !pw) usage();
    let newDbName = sid ? convertSidToGradleDbName(sid.toLowerCase()) : null;
    
    let cfgFile = getGradlePropertiesFile();
    let cfg = fs.readFileSync(cfgFile).toString();
    cfg = cfg.replace(/^dbUser=.*$/m, "dbUser=" + user);
    cfg = cfg.replace(/^dbPW=.*$/m, "dbPW=" + pw);

    if(newDbName)
        cfg = cfg.replace(/^dbName=.*$/m, "dbName=" + newDbName);

    fs.writeFileSync(cfgFile, cfg);
    showCurrentSettings();
}

async function executeSQL(script) {
    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    let win = process.platform === "win32";
    await util.spawn(win ? "sqlplus.exe" : "sqlplus", [getDBConnectionString(), "@"+script], sbox.path+"/fi-asm-assembly/install/sql", "quit\n");
}

async function executeAsDBA(sql) {
    let win = process.platform === "win32";
    let connString = "/@"+getSID();
    if(getDbUser().toLowerCase() === "sys"){
        connString = getDBConnectionString();
    }
    await util.spawn(win ? "sqlplus.exe" : "sqlplus",
        [connString, "as", "sysdba"], null, sql);
}

async function initDBMS() {

    // grant system permissions
    let sql = `grant select on pending_trans$ to public;
grant select on dba_2pc_pending to public;
grant select on dba_pending_transactions to public;
grant execute on dbms_system to public;
`;

    // create tablespaces
    const tablespaces = [
        'PCE_TX','PCE_IDX','PCE_LOOKUP','PCE_JOURNAL','PCE_DATASTORE','PCE_ACCOUNTING',
        'PCE_REPORTING','PCE_REPORTING_IDX','PCE_REPORTING_BLOCK','PCE_REPORTING_COUNT','PCE_REPORTING_DEV','PCE_REPORTING_TX','PCE_REPORTING_TX2','PCE_REPORTING_TX3', 'PCE_ROPS'
    ]

    for (let t of tablespaces) {
        sql += "CREATE BIGFILE TABLESPACE "+t+" DATAFILE 'c:/oraclexe/FI/"+t+".dbf' SIZE 100M AUTOEXTEND ON NEXT 1024K MAXSIZE UNLIMITED NOLOGGING EXTENT MANAGEMENT LOCAL SEGMENT SPACE MANAGEMENT AUTO;\r\n";
    }
    sql += "quit\r\n";
    await executeAsDBA(sql);
}

async function createSchema(user, pw) {
    if (!user || !pw) usage();

    let sql = `
ALTER SESSION SET "_ORACLE_SCRIPT"=true; 
DECLARE
	user_count NUMBER;
BEGIN
-- schaue nach, ob es schon user mit dieser kennung gibt! wenn ja -> droppen!
SELECT COUNT (1) INTO user_count FROM dba_users WHERE username = UPPER ('$user');
	IF (user_count > 0) THEN
	-- es gibt schon mehr als einen user mit dieser kennung. force logout -> user darf nicht eingeloggt sein, wenn das schema gedroppt wird!!
		BEGIN
		-- suche connections zu dem schema
		   FOR ln_cur IN (SELECT sid, serial# FROM v$session WHERE username = UPPER ('$user'))
		   LOOP
		   -- wenn user eingeloggt sind, session killen!
			  EXECUTE IMMEDIATE ('ALTER SYSTEM KILL SESSION ''' || ln_cur.sid || ',' || ln_cur.serial# || ''' IMMEDIATE');
		   END LOOP;
		END;
		-- drop user
		EXECUTE IMMEDIATE('DROP USER $user CASCADE');
	END IF;
END;
/
commit;

CREATE USER $user PROFILE DEFAULT IDENTIFIED BY $password DEFAULT TABLESPACE PCE_TX TEMPORARY TABLESPACE TEMP ACCOUNT UNLOCK;
GRANT CREATE TABLE TO $user;
GRANT CREATE VIEW TO $user;
GRANT CREATE SYNONYM TO $user;
GRANT UNLIMITED TABLESPACE TO $user;
GRANT CONNECT TO $user;
GRANT RESOURCE TO $user;
grant execute on dbms_system to $user;
commit;
quit;
`
    sql = sql.replace(/\$user/g, user).replace(/\$password/g, pw);
    await executeAsDBA(sql);
}

async function fixOracleListener() {
    let win = process.platform === "win32";
    // connect as sysdba without SID!
    await util.spawn(win ? "sqlplus.exe" : "sqlplus", ["/", "as", "sysdba"], null, `startup;
quit;
`);
}

async function configureConfigFile(useProjectSpecific) {

    if (useProjectSpecific === undefined || useProjectSpecific === null) {
        if (isUseProjectSpecificConfigurationSet()) {
            console.log("Return to default configuration")
            migrateDbEntries(true, false);
        }
        process.exit();
    }

    let isUseProjectSpecific = /^true$/i.test(useProjectSpecific);
    if (!isUseProjectSpecific && !/^false$/i.test(useProjectSpecific)) {
        usage();
    }

    let storedValue = getUseProjectSpecificConfiguration();

    // Check if value is unchanged
    if (isUseProjectSpecific === storedValue) {
        console.log("Configuration type not changed")
    } else {
        console.log("Use project specific gradle.properties : " + useProjectSpecific);
        migrateDbEntries(false, useProjectSpecific);
    }
}

// Get the value for the configuration parameter "config.useSandboxConfiguration" as boolean
function getUseProjectSpecificConfiguration() {
    let storedValue = globalThis.settings.value(PARAM_USE_PROJECT_CONFIGURATION);
    if (storedValue === undefined || storedValue === null) {
        return false;
    }
    return /^true$/i.test(storedValue);
}

// Check if the configuration parameter "config.useSandboxConfiguration" is set in the configuration
function isUseProjectSpecificConfigurationSet() {
    let storedValue = globalThis.settings.value(PARAM_USE_PROJECT_CONFIGURATION);
    return !(storedValue === undefined || storedValue === null);
}

function migrateDbEntries(useDefault, useProjectSpecific) {

    let cfgFile = getGradlePropertiesFile();

    // Read the original values
    let dbProps = propreader(getGradlePropertiesFile());
    let dbType = dbProps.get("dbType");
    let dbConnection = dbProps.get("dbConnection");
    let dbPort = dbProps.get("dbPort");
    let dbName = dbProps.get("dbName");
    let dbUser = dbProps.get("dbUser");
    let dbPw = dbProps.get("dbPW");
    let dbOwner = dbProps.get("dbOwner");
    let dbSchema = dbProps.get("dbSchema");

    if (useDefault) {
        globalThis.settings.delete(PARAM_USE_PROJECT_CONFIGURATION);
    } else {
        globalThis.settings.setValue(PARAM_USE_PROJECT_CONFIGURATION, useProjectSpecific);
    }

    let newCfgFile = getGradlePropertiesFile();
    if (cfgFile === newCfgFile) {
        console.log("Configuration file not changed");
        console.log("Old configuration filename: " + cfgFile);
        console.log("New configuration filename: " + newCfgFile);
        return;
    }

    // Remove the values from the old configuration file
    deleteEntriesFromConfiguration(cfgFile);

    // Remove the values from the new configuration file
    let cfg = deleteEntriesFromConfiguration(newCfgFile);
    if (!cfg.endsWith("\n")) {
        cfg = cfg + "\n";
    }
    // Write the configuration to the new configuration file
    cfg = cfg + "dbType=" + dbType + "\n" +
        "dbConnection=" + dbConnection + "\n" +
        "dbPort=" + dbPort + "\n" +
        "dbName=" + dbName + "\n" +
        "dbUser=" + dbUser + "\n" +
        "dbPW=" + dbPw + "\n" +
        "dbOwner=" + dbOwner + "\n";
    if (dbSchema !== undefined && dbSchema !== null) {
        cfg = cfg + "dbSchema=" + dbSchema + "\n";
    }
    fs.writeFileSync(newCfgFile, cfg);
    console.log("Configuration file in use: " + newCfgFile)
    showCurrentSettings();
}

function deleteEntriesFromConfiguration(filename) {
    let cfg = fs.readFileSync(filename).toString();
    cfg = cfg.replace(/^dbType=.*\n/m, "");
    cfg = cfg.replace(/^dbConnection=.*\n/m, "");
    cfg = cfg.replace(/^dbPort=.*\n/m, "");
    cfg = cfg.replace(/^dbName=.*\n/m, "");
    cfg = cfg.replace(/^dbUser=.*\n/m, "");
    cfg = cfg.replace(/^dbPW=.*\n/m, "");
    cfg = cfg.replace(/^dbOwner=.*\n/m, "");
    cfg = cfg.replace(/^dbSchema=.*\n/m, "")
    fs.writeFileSync(filename, cfg);
    return cfg;
}
