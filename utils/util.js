const {exec,spawn} = require('child_process');

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
 * Spawns a child command with inherited stdio
 */
module.exports.spawn = async function(cmd, args, cwd) {
    const childProcess = spawn(cmd, args, {
        cwd: cwd,
        stdio: [process.stdin, process.stdout, process.stderr]});

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
