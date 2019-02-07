const {exec,spawn,spawnSync} = require('child_process');
const portscanner = require('portscanner');
const fs = require('fs');

/**
 * Executes a command with promise
 */
module.exports.exec = async function(cmdline, cwd) {
    return new Promise((resolve,reject) => {
        exec(cmdline, {cwd: cwd}, err => {
            if (err) reject();
            else resolve();
        });
    });
}

/**
 * Spawns a child command with inherited stdio.
 */
module.exports.spawn = async function(cmd, args, cwd, stdindata) {
    const childProcess = spawn(cmd, args, {
        cwd: cwd,
        stdio: [stdindata ? 'pipe' : process.stdin, process.stdout, process.stderr]});

    if (stdindata) childProcess.stdin.write(stdindata);

    return new Promise((resolve, reject) => {
        childProcess.once('exit', (code, signal) => resolve(code));
        childProcess.once('error', err =>reject(err));
    });
}

/**
 * Spawns a detached child process without stdio
 */
module.exports.spawnDetached = async function(cmd, args, cwd) {
    spawn(cmd, args, {
        cwd: cwd,
        silent: true,
        detached: true,
        stdio: [null, null, null]});
}

/**
 * Checks if a port is open, returns boolean
 */
module.exports.isPortOpen = async function(port) {
    return portscanner.checkPortStatus(port, 'localhost').then(status => status === 'open');
}

module.exports.determineServerPort = function(servers, type='txm') {
    let d = global.settings.value("defaults.server");
    for (let server of Object.values(servers)) {
        if (server.name.startsWith(d) && server.type == type) return server.port;
    }
    return 8080;
}

module.exports.determineSandboxVersion = function(sbox) {
    sbox = sbox || global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    if (!sbox) return null;
    let sandboxVersionFile = fs.readFileSync(sbox.path+"/version.txt");
    let sandboxVersion = /([\d\.]*)-.*/.exec(sandboxVersionFile)[1];
    return sandboxVersion;
}

module.exports.asyncPause = async function(timeout) {
    return new Promise(resolve => setTimeout(resolve, timeout));
}

module.exports.getNPMConfigValue = async function(key) {
    var win = process.platform === "win32";
    const childProcess = spawn(win ? 'npm.cmd' : 'npm', ['config', 'get', key],
        { stdio: ['ignore', 'pipe', 'pipe'] });
    
    let result = "";
    childProcess.stdout.on('data', d => result += d);
    return new Promise((resolve, reject) => {
        childProcess.once('exit', (code, signal) => resolve(result.replace(/\n$/,'')));
        childProcess.once('error', err =>reject(err));
    });
}
