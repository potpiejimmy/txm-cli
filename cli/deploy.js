const fs = require('fs');
const del = require('del');
const ncp = require('ncp');
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
    for (let server of Object.values(servers)) {
        if (server.name.startsWith(defsrv)) {
            console.log("-----");
            console.log("Deploying " + server.type + " to " + server.path);
            await deployServer(sbox, server);
        }
    };
}

async function deployServer(sbox, server) {
    let sandboxVersionFile = fs.readFileSync(sbox.path+"/version.txt");
    let sandboxVersion = /([\d\.]*)-.*/.exec(sandboxVersionFile)[1];
    let earname = "txm-server.ear";
    let earorigin = "fi-asm-assembly-"+sandboxVersion+"-SNAPSHOT/txm-server.ear";
    if (server.type == 'rops') {
        earname = "txm-server-rops.ear";
        earorigin = "fi-asm-assembly-"+sandboxVersion+"-SNAPSHOT/fi-asm-assembly-rops/txm-server-rops.ear";
    } else if (server.type == 'kko') {
        earname = "txm-server-vorrechner.ear";
        earorigin = "fi-asm-assembly-"+sandboxVersion+"-SNAPSHOT/fi-asm-assembly-vorrechner/txm-server-vorrechner.ear";
    }
    console.log("EAR file: " + earorigin);
    let path = server.path;
    if (fs.existsSync(path+"/deployments")) path += "/deployments/";
    else path += "/dropins/";
    path += earname;
    console.log("Deleting " + path);
    deltree(path);
    console.log("Extracting " + path);
    await extractEarFromDist(sbox.path + "/fi-asm-assembly/build/distributions/fi-asm-assembly-"+sandboxVersion+"-SNAPSHOT.zip", earorigin, path);

    let basepath = path;
    if (server.type != 'rops') {
        // for txm and kko servers, explode the ear, war and FI fragment:
        unjar(path);
        path += "/ocm.war";
        unjar(path);
        path += "/WEB-INF/lib/fi-ocm-wf.jar";
        unjar(path);
    }

    if (server.serverType === 'jboss' && server.type === 'txm') {
        console.log("> Fixing deployment for JBoss");
        path = basepath + "/lib/DynsFramework.jar";
        unjar(path);
        path = basepath + "/fi-eisco-dyns-ejb.jar";
        unjar(path);
        path += "/de";
        await copytree(path, basepath + "/lib/DynsFramework.jar/de");
        deltree(path);
        path = basepath + "/GenericRA.rar";
        unjar(path);
        await copytree(path, basepath + "/lib");
        deltree(path+"/*.jar");
        try {deltree(basepath+"/lib/META-INF");} catch (e) {}
        console.log("> Done fixing deployment for JBoss");
    }

    console.log("Successfully deployed " + server.type + " application.");
}

function unjar(path) {
    console.log("Exploding " + path);
    let tmpfile = path + ".extracting";
    fs.renameSync(path,tmpfile);
    var ear = new AdmZip(tmpfile);
    ear.extractAllTo(path, /*overwrite*/true);
    deltree(tmpfile);
}

function deltree(path) {
    del.sync([path], {force: true});
}

async function copytree(source, dest) {
    return new Promise((resolve,reject) => {
        ncp.ncp(source, dest, err => {
            if (err) return reject(err);
            resolve();
        })
    });
}

async function extractEarFromDist(zipfile, earfile, outfile) {

    let zipdata = fs.readFileSync(zipfile);
    let zip = await JSZip.loadAsync(zipdata);
    let data = await zip.file(earfile).async("uint8array");

    fs.writeFileSync(outfile, data);
}

module.exports.invoke = invoke;
