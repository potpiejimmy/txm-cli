import fetch from "node-fetch";
import clipboardy from "clipboardy";
import xml2js from 'xml2js';
import fs from 'fs';
import * as util from '../utils/util.js';

export async function invoke(args) {
    // first, use the release specified as argument
    // second, if no argument, determine the release version from the current sandbox's version.txt
    // last, if no sandbox present, use the default version
    let argsSorted = fixArguments(args);
    argsSorted['version'] = argsSorted['version'] || util.determineSandboxVersion() || '19.1.00';
    if(!argsSorted['branch']) argsSorted['branch'] = "master"
    await lastbn(argsSorted);
}

function fixArguments(args) {
    let argsSorted = {};
    args.forEach(a => {
        if(a.toUpperCase() === "D"){
            argsSorted['download'] = true;
        }
        else if(a.length > 1 && a.length < 8 && a.match(/^\d/)){
            argsSorted['version'] = a;
        }else{
            argsSorted['branch'] = a;
        }
    });
    return argsSorted;
}

async function downloadFile(url, name, authToken) {
    console.log("Downloading " + url + " to " + name);
    let start = new Date();
    return fetch(url, {
        headers: {Accept: "application/json", Authorization: "Basic " + util.getBase64(authToken)}
    })
        .then(res => new Promise((resolve, reject) => {
            const dest = fs.createWriteStream(name);
            res.body.pipe(dest);
            dest.on('finish', () => {
                let end = (new Date() - start) / 1000;
                console.info('Execution time: %ds', end);
                console.info("Path to the file: " + __dirname + "/../" + dest.path);
                resolve();
            });
            dest.on('error', err => reject(err));
        }));
}

async function download(url, args, authToken) {
    const finalFile = await askServer(url, args, authToken);
    return downloadFile(url + "fi-asm-assembly-" + finalFile + ".zip", finalFile + ".zip", authToken)
}

async function lastbn(args) {
    let authToken = await util.getAuthKey('auth-nexus3de');
    if (!authToken) return;
    let url = "https://nexus3de.dieboldnixdorf.com/repository/maven-dev-group/com/dieboldnixdorf/txm/project/fi/fi-asm-assembly/";
    let result = await askServer(url, args, authToken)


    if (result) {
        console.log(result);
        if (args['download']) {
            // download artifact
            return download(url + result + "/", args, authToken);
        } else {
            // or copy to clipboard
            try {
                clipboardy.writeSync(">" + result);
            } catch (e) {
                console.log("Could not copy BN to clipboard: " + e);
            }
        }
    } else {
        console.log("No build found for this release version!");
    }
}

async function askServer(url, args, authToken) {
    return fetch(url + "maven-metadata.xml", {
        headers: {Accept: "application/xml", Authorization: "Basic " + util.getBase64(authToken)}
    })
        .then(result => {
            if (result.status !== 200) throw new Error("HTTP " + result.status + " " + result.statusText);
            return result.text()
        })
        .then(result => {
            xml2js.parseString(result, function (_err, res) {
                let initiator = url.includes("-Build.");
                let versions = decideVersioning(res, initiator);
                let reg = new RegExp(`${args['version']}.+?Build\..+`);
                if (args['branch']) reg = new RegExp(`${args['version']}.+?Build\..+?${sanitizeBranchName(args['branch'])}.+`);
                //No need to loop if latest build for the requested version is in the latest tag.
                //Had to ignore 22.1.00-Build.1-Dev.FITM.1511.TM.3.1.6264-24b3144-SNAPSHOT manually - Nexus has maybe bugged out
                if(!initiator && reg.test(res.metadata.versioning[0]['latest'][0]) && res.metadata.versioning[0]['latest'][0] !== "22.1.00-Build.1-Dev.FITM.1511.TM.3.1.6264-24b3144-SNAPSHOT"){
                    result = res.metadata.versioning[0]['latest'][0];
                    return result;
                }

                //Otherwise loop from down to up.
                for (let x = (versions.length - 1); x >= 0; x--) {
                    //Had to ignore 22.1.00-Build.1-Dev.FITM.1511.TM.3.1.6264-24b3144-SNAPSHOT manually - Nexus has maybe bugged out
                    if (!initiator && reg.test(versions[x]) && versions[x] !== "22.1.00-Build.1-Dev.FITM.1511.TM.3.1.6264-24b3144-SNAPSHOT") {
                        result = versions[x]
                        return result;
                    }
                    else if(initiator){

                       if(versions[x].extension[0] === 'zip'){
                           result = versions[x].value[0];
                           return versions[x].value[0];
                       }
                    }
                }
            })
            return result;
        }).catch((err) => console.log("Can not read build version for " + args['version'] + ": " + err));
}

function decideVersioning(xml, initiator) {
    if (!initiator) return xml.metadata.versioning[0]['versions'][0]['version'];
    return xml.metadata.versioning[0]['snapshotVersions'][0]['snapshotVersion'];
}

function sanitizeBranchName(branch){
    return branch.replace("-", ".").replace("/", ".");
}
