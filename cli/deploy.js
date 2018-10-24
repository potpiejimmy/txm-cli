const fs = require('fs');
const del = require('del');
var JSZip = require("jszip");
var AdmZip = require('adm-zip');
var exec = require('child_process').exec;

async function invoke(args) {
    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    let server = global.settings.value("servers." + global.settings.value("defaults.server"));
    if (!sbox || !server) {
        console.log("Please configure default server and sandbox first.");
        return;
    }

    let path = server.path + "/deployments/txm-server.ear";
    console.log("Deleting " + path);
    deltree(path);
    console.log("Extracting " + path);
    await extractEarFromDist(sbox.path + "/fi-asm-assembly/build/distributions/fi-asm-assembly-19.0.00-SNAPSHOT.zip", path);
    unjar(path);
    path += "/ocm.war";
    unjar(path);
    path += "/WEB-INF/lib/fi-ocm-wf.jar";
    unjar(path);
    console.log("Successfully deployed.");
}

function unjar(path) {
    console.log("Unjar " + path);
    let tmpfile = path + ".extracting";
    fs.renameSync(path,tmpfile);
    var ear = new AdmZip(tmpfile);
    ear.extractAllTo(path, /*overwrite*/true);
    deltree(tmpfile);
}

function deltree(path) {
    del.sync([path], {force: true});
}

async function extractEarFromDist(zipfile, outfile) {

    let zip = await new Promise((resolve,reject) => {
        fs.readFile(zipfile, (err, data) => {
            if (err) reject(err);
            JSZip.loadAsync(data).then(z => resolve(z));
        });
    });

    let data = await new Promise((resolve,reject) => {
        zip.file("fi-asm-assembly-19.0.00-SNAPSHOT/txm-server.ear").async("uint8array").then(d => resolve(d));
    });

    fs.writeFileSync(outfile, data);
}

async function execute(cmd, cwd) {
    exec('pwd', {
      cwd: '/home/user/directory'
    }, function(error, stdout, stderr) {
      // work with result
    });
}

module.exports.invoke = invoke;
