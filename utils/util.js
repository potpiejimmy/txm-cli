import * as cpr from 'child_process';
import portscanner from 'portscanner';
import fs from 'fs';
import { deleteSync } from 'del';
import ncp from 'ncp';
import AdmZip from 'adm-zip';
import fetch from "node-fetch";
import os from 'os';
import dns from 'dns';
import open from 'opn';

/**
 * Executes a command with promise
 */
export async function exec(cmdline, cwd) {
    return new Promise((resolve, reject) => {
        cpr.exec(cmdline, {cwd: cwd}, err => {
            if (err) reject(err);
            else resolve();
        });
    });
}

/**
 * Spawns a child command with inherited stdio.
 */
export async function spawn(cmd, args, cwd, stdindata) {
    const childProcess = cpr.spawn(args && args.length > 0 ? `${cmd} ${args.join(' ')}` : cmd, [], {
        cwd: cwd,
        shell: true,
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
export async function spawnDetached(cmd, args, cwd) {
    cpr.spawn(args && args.length > 0 ? `${cmd} ${args.join(' ')}` : cmd, [], {
        cwd: cwd,
        shell: true,
        silent: true,
        detached: true,
        stdio: ['inherit', 'inherit', 'inherit']
    });
}

/**
 * Checks if a port is open, returns boolean
 */
export async function isPortOpen(port) {
    return portscanner.checkPortStatus(port, 'localhost').then(status => status === 'open');
}

/**
 * Get Nexus authentication key from configuration
 */
export async function getAuthKey(key) {
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
export function getBase64(text) {
    if(!text) return;
    return new Buffer.from(text).toString('base64');
}

export function determineServerPort(servers, type = 'txm') {
    let d = global.settings.value("defaults.server");
    for (let server of Object.values(servers)) {
        if (server.name.startsWith(d) && server.type == type) return server.port;
    }
    return 8080;
}

export function determineSandboxVersion(sbox) {
    sbox = sbox || global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    if (!sbox) return null;
    let sandboxVersionFile = fs.readFileSync(sbox.path + "/version.txt");
    let sandboxVersion = /([\d\.].*?)-.*/.exec(sandboxVersionFile)[1];
    return sandboxVersion;
}

export async function asyncPause(timeout) {
    return new Promise(resolve => setTimeout(resolve, timeout));
}

export async function getNPMConfigValue(key) {
    var win = process.platform === "win32";
    const npm = win ? 'npm.cmd' : 'npm';
    const childProcess = cpr.spawn(`${npm} config get ${key}`, [],
        {
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });

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

export async function pressEnter() {
    return new Promise(resolve => process.stdin.once('data', () => resolve()));
}

export function unjar(path) {
    console.log("Exploding " + path);
    let tmpfile = path + ".extracting";
    fs.renameSync(path, tmpfile);
    var ear = new AdmZip(tmpfile);
    ear.extractAllTo(path, /*overwrite*/true);
    deltree(tmpfile);
}

export function deltree(path) {
    deleteSync([path], {force: true});
}

export async function copytree(source, dest) {
    return new Promise((resolve, reject) => {
        ncp.ncp(source, dest, err => {
            if (err) return reject(err);
            resolve();
        })
    });
}

export async function downloadFile(url, targetFile, fetchOptions) {
    console.log("Downloading " + url + " to " + targetFile);
    let start = new Date();
    return fetch(url, fetchOptions).then(res => new Promise((resolve, reject) => {
        const dest = fs.createWriteStream(targetFile);
        res.body.pipe(dest);
        dest.on('finish', () => {
            let end = (new Date() - start) / 1000;
            console.info('Execution time: %ds', end);
            console.info("Path to the file: " + dest.path);
            resolve();
        });
        dest.on('error', err => reject(err));
    }));
}

export async function getFullyQualifiedHostName() {
    let hostname = os.hostname();

    let ipa = await new Promise((resolve,reject) => {
        dns.lookup(hostname, (err, ia) => err ? reject(err) : resolve (ia));
    });

    try {
        let fqdn = await new Promise((resolve,reject) => {
            dns.reverse(ipa, (err, dns) => err ? reject(err) : resolve (dns[0]));
        });
        return hostname + fqdn.substr(fqdn.indexOf("."));
    } catch (ex) {
        console.warn("Could not resolve domain name for " + hostname + "/" + ipa + ", using ad.diebold.com as a fallback.");
        return hostname + ".ad.diebold.com";
    }
}

export async function openUrl(url, browser) {
    console.log("Opening " + url + (browser ? (" in " + browser) : ""));
    let cp = await open(url, {app: browser, wait: false});
    return new Promise(resolve => cp.on('close', resolve));
}
