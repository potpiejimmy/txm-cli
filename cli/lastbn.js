const fetch = require("node-fetch");
const clipboardy = require("clipboardy");
const xml2js = require('xml2js');
const fs = require('fs');
const util = require('../utils/util');

async function invoke(args) {
    // first, use the release specified as argument
    // second, if no argument, determine the release version from the current sandbox's version.txt
    // last, if no sandbox present, use the default version
    fixArguments(args);
    let version = args[0] || util.determineSandboxVersion() || '19.1.00';
    await lastbn(version, args);
}

function fixArguments(args) {
    if (args.length > 0 && args[0].toLowerCase().startsWith("d")) {
        args[1] = args[0];
        args[0] = util.determineSandboxVersion() || '19.1.00'
    }
}

async function downloadFile(url, name, authToken) {
    console.log("Downloading " + url + " to " + name);
    var start = new Date();
    return fetch(url, {
        headers: {Accept: "application/json", Authorization: "Basic " + util.getBase64(authToken)}
    })
        .then(res => new Promise((resolve, reject) => {
            const dest = fs.createWriteStream(name);
            res.body.pipe(dest);
            dest.on('finish', () => {
                let end = (new Date() - start) / 1000;
                console.info('Execution time: %ds', end);
                console.info("Path to the file: " + __dirname + "/" + dest.path);
                resolve();
            });
            dest.on('error', err => reject(err));
        }));
}

async function download(url, version, authToken) {
    const finalFile = await askServer(url, version, authToken);
    return downloadFile(url + "fi-asm-assembly-" + finalFile + ".zip", finalFile + ".zip", authToken)
}

async function lastbn(version, args) {
    let authToken = await util.getAuthKey('auth-nexus3de');
    if (!authToken) return;
    let url = "https://nexus3de.dieboldnixdorf.com/repository/maven-dev-group/com/dieboldnixdorf/txm/project/fi/fi-asm-assembly/";
    let result = await askServer(url, version, authToken)


    if (result) {
        console.log(result);
        if (args.length > 1 && args[1].toLowerCase().startsWith('d')) {
            // download artifact
            return download(url + result + "/", version, authToken);
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

async function askServer(url, version, authToken) {
    return fetch(url + "maven-metadata.xml", {
        headers: {Accept: "application/xml", Authorization: "Basic " + util.getBase64(authToken)}
    })
        .then(result => {
            if (result.status !== 200) throw "HTTP " + result.status + " " + result.statusText;
            return result.text()
        })
        .then(result => {
            xml2js.parseString(result, function (err, res) {
                let initiator = url.includes("Dev.master");
                let versions = decideVersioning(res, initiator);
                let reg = new RegExp(`${version}-Build\\..-Dev\\.master.+`);
                if (version !== util.determineSandboxVersion() && version !== '19.1.00')  reg = new RegExp(`${version}.+?-Build\\..+`);
                for (let x = (versions.length - 1); x >= 0; x--) {
                    if (!initiator && reg.test(versions[x])) {
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
        }).catch((err) => console.log("Can not read build version for " + version + ": " + err));
}

function decideVersioning(xml, initiator) {
    if (!initiator) return xml.metadata.versioning[0]['versions'][0]['version'];
    return xml.metadata.versioning[0]['snapshotVersions'][0]['snapshotVersion'];
}

module.exports.invoke = invoke;
