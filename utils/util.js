const {exec, spawn, spawnSync} = require('child_process');
const portscanner = require('portscanner');
const fs = require('fs');
const del = require('del');
const ncp = require('ncp');
var AdmZip = require('adm-zip');

/**
 * Executes a command with promise
 */
module.exports.exec = async function (cmdline, cwd) {
    return new Promise((resolve, reject) => {
        exec(cmdline, {cwd: cwd}, err => {
            if (err) reject();
            else resolve();
        });
    });
}

/**
 * Spawns a child command with inherited stdio.
 */
module.exports.spawn = async function (cmd, args, cwd, stdindata) {
    const childProcess = spawn(cmd, args, {
        cwd: cwd,
        stdio: [stdindata ? 'pipe' : process.stdin, process.stdout, process.stderr]
    });

    if (stdindata) childProcess.stdin.write(stdindata);

    return new Promise((resolve, reject) => {
        childProcess.once('exit', (code, signal) => resolve(code));
        childProcess.once('error', err => reject(err));
    });
}

/**
 * Spawns a detached child process without stdio
 */
module.exports.spawnDetached = async function (cmd, args, cwd) {
    spawn(cmd, args, {
        cwd: cwd,
        silent: true,
        detached: true,
        stdio: ['inherit', 'inherit', 'inherit']
    });
}

/**
 * Checks if a port is open, returns boolean
 */
module.exports.isPortOpen = async function (port) {
    return portscanner.checkPortStatus(port, 'localhost').then(status => status === 'open');
}

/**
 * Get Nexus authentication key from configuration
 */
module.exports.getAuthKey = async function (key) {
    let authToken = global.settings.value("config." + key);
    if (!authToken) {
        authToken = await this.getNPMConfigValue('txm-' + key);
        if (authToken) global.settings.setValue("config." + key, authToken);
    }
    if (!authToken) {
        if(key === "auth-nexus3de"){
            console.log("Hello. Support for Nexus 3 has been added. If you want to use new features on this repository, please add new auth key.\nOld nexus key is still valid and saved.")
        }
        console.log("Warning: No authentication token '" + key + "' found. Set it using 'tm config set " + key + " <token>'");
        return null;
    }
    return authToken;
}

/**
 * Create Base64 from inputted text.
 */
module.exports.getBase64 = function (text) {
    if(!text) return;
    return new Buffer.from(text).toString('base64');
}

module.exports.determineServerPort = function (servers, type = 'txm') {
    let d = global.settings.value("defaults.server");
    for (let server of Object.values(servers)) {
        if (server.name.startsWith(d) && server.type == type) return server.port;
    }
    return 8080;
}

module.exports.determineSandboxVersion = function (sbox) {
    sbox = sbox || global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    if (!sbox) return null;
    let sandboxVersionFile = fs.readFileSync(sbox.path + "/version.txt");
    let sandboxVersion = /([\d\.].*?)-.*/.exec(sandboxVersionFile)[1];
    return sandboxVersion;
}

module.exports.asyncPause = async function (timeout) {
    return new Promise(resolve => setTimeout(resolve, timeout));
}

module.exports.getNPMConfigValue = async function (key) {
    var win = process.platform === "win32";
    const childProcess = spawn(win ? 'npm.cmd' : 'npm', ['config', 'get', key],
        {stdio: ['ignore', 'pipe', 'pipe']});

    let result = "";
    childProcess.stdout.on('data', d => result += d);
    return new Promise((resolve, reject) => {
        childProcess.once('exit', (code, signal) => {
            let value = result.replace(/\n$/, '');
            if (value === "undefined") value = null;
            resolve(value);
        });
        childProcess.once('error', err => reject(err));
    });
}

module.exports.pressEnter = async function () {
    return new Promise(resolve => process.stdin.once('data', () => resolve()));
}

module.exports.unjar = function (path) {
    console.log("Exploding " + path);
    let tmpfile = path + ".extracting";
    fs.renameSync(path, tmpfile);
    var ear = new AdmZip(tmpfile);
    ear.extractAllTo(path, /*overwrite*/true);
    module.exports.deltree(tmpfile);
}

module.exports.deltree = function (path) {
    del.sync([path], {force: true});
}

module.exports.copytree = async function (source, dest) {
    return new Promise((resolve, reject) => {
        ncp.ncp(source, dest, err => {
            if (err) return reject(err);
            resolve();
        })
    });
}
