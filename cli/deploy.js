import fs from 'fs';
import JSZip from "jszip";
import * as serverUtil from "./server.js";
import * as util from '../utils/util.js';

export async function invoke(_args) {
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
    }
}

export function getDeploymentPath(server) {
    let earname = "txm-server.ear";
    if (server.type === 'rops') {
        earname = "txm-server-rops.ear";
    } else if (server.type === 'kko') {
        earname = "txm-server-vorrechner.ear";
    }
    let path = server.path;
    if (fs.existsSync(path+"/deployments")) path += "/deployments/";
    else path += "/dropins/";
    path += earname;
    return path;
}

function getEarOrigin(sbox, server) {
    let sandboxVersion = util.determineSandboxVersion(sbox);
    let earorigin = "fi-asm-assembly-"+sandboxVersion+"-SNAPSHOT/txm-server.ear";
    if (server.type === 'rops') {
        earorigin = "fi-asm-assembly-"+sandboxVersion+"-SNAPSHOT/fi-asm-assembly-rops/txm-server-rops.ear";
    } else if (server.type === 'kko') {
        earorigin = "fi-asm-assembly-"+sandboxVersion+"-SNAPSHOT/fi-asm-assembly-vorrechner/txm-server-vorrechner.ear";
    }
    console.log("EAR file: " + earorigin);
    return earorigin;
}

async function deployServer(sbox, server) {
    let sandboxVersion = util.determineSandboxVersion(sbox);
    let path = getDeploymentPath(server);
    let earorigin = getEarOrigin(sbox, server);

    console.log("Stopping server: " + server.name);
    await serverUtil.stop(server.name);

    console.log("Deleting " + path);
    util.deltree(path);
    console.log("Extracting " + path);
    await extractEarFromDist(sbox.path + "/fi-asm-assembly/build/distributions/fi-asm-assembly-"+sandboxVersion+"-SNAPSHOT.zip", earorigin, path);

    let basepath = path;
    if (server.type !== 'rops') {
        // for txm and kko servers, explode the ear, war and FI fragment:
        util.unjar(path);
        if(fs.existsSync(path + "/ocm.war")) path += "/ocm.war";
        else path += "/server.war"
        util.unjar(path);
        path += "/WEB-INF/lib/fi-ocm-wf.jar";
        util.unjar(path);
    }

    if (server.serverType === 'jboss' && server.type === 'txm') {
        console.log("> Fixing deployment for JBoss");
        path = basepath + "/lib/DynsFramework.jar";
        util.unjar(path);
        path = basepath + "/fi-eisco-dyns-ejb.jar";
        util.unjar(path);
        path += "/de";
        await util.copytree(path, basepath + "/lib/DynsFramework.jar/de");
        util.deltree(path);
        path = basepath + "/GenericRA.rar";
        util.unjar(path);
        await util.copytree(path, basepath + "/lib");
        util.deltree(path+"/*.jar");
        try {util.deltree(basepath+"/lib/META-INF");} catch (e) {}
        console.log("> Done fixing deployment for JBoss");
    }

    console.log("Successfully deployed " + server.type + " application.");
}

async function extractEarFromDist(zipfile, earfile, outfile) {

    let zipdata = fs.readFileSync(zipfile);
    let zip = await JSZip.loadAsync(zipdata);
    let data = await zip.file(earfile).async("uint8array");

    fs.writeFileSync(outfile, data);
}
