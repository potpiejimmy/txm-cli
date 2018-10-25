const fs = require('fs');
const del = require('del');
var JSZip = require("jszip");
var AdmZip = require('adm-zip');

async function invoke(args) {
    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    let defsrv = global.settings.value("defaults.server");
    if (!sbox || !defsrv) {
        console.log("Please configure default server(s) and sandbox first.");
        return;
    }
    let servers = global.settings.value("servers");
    for (let key of Object.keys(servers)) {
        let server = servers[key];
        if (server.name.startsWith(defsrv)) {
            console.log("Deploying " + server.type + " to " + server.path);
            await deployServer(sbox, server);
        }
    };
}

async function deployServer(sbox, server) {
    let earname = "txm-server.ear";
    let earorigin = "fi-asm-assembly-19.0.00-SNAPSHOT/txm-server.ear";
    if (server.type == 'rops') {
        earname = "txm-server-rops.ear";
        earorigin = "fi-asm-assembly-19.0.00-SNAPSHOT/fi-asm-assembly-rops/txm-server-rops.ear";
    } else if (server.type == 'kko') {
        earname = "txm-server-vorrechner.ear";
        earorigin = "fi-asm-assembly-19.0.00-SNAPSHOT/fi-asm-assembly-vorrechner/txm-server-vorrechner.ear";
    }
    let path = server.path;
    if (fs.existsSync(path+"/deployments")) path += "/deployments/";
    else path += "/dropins/";
    path += earname;
    console.log("Deleting " + path);
    deltree(path);
    console.log("Extracting " + path);
    await extractEarFromDist(sbox.path + "/fi-asm-assembly/build/distributions/fi-asm-assembly-19.0.00-SNAPSHOT.zip", earorigin, path);

    if (server.type != 'rops') {
        // for txm and kko servers, explode the ear, war and FI fragment:
        unjar(path);
        path += "/ocm.war";
        unjar(path);
        path += "/WEB-INF/lib/fi-ocm-wf.jar";
        unjar(path);
    }
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

async function extractEarFromDist(zipfile, earfile, outfile) {

    let zipdata = await new Promise((resolve,reject) => {
        fs.readFile(zipfile, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });

    let zip = await JSZip.loadAsync(zipdata);
    let data = await zip.file(earfile).async("uint8array");

    fs.writeFileSync(outfile, data);
}

module.exports.invoke = invoke;
