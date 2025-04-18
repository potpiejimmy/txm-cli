import fetch from "node-fetch";
import * as util from '../utils/util.js';
import xml2js from 'xml2js';

function usage() {
    console.log("Usage:  tm latestb <b> <d> <v>");
    console.log();
    console.log("  Tells you latest product build by your chosen release branch");
    console.log();
    console.log("  <b> stands for the selected release branch. public (stable) or snapshot (development)");
    console.log("  <d> here you can specify your requested dependency. Keep this form: groupId/artifactId")
    console.log("  <v> means your TM version. For example: 2.3, 3.0.0, 3.1.0 etc.")

    process.exit();
}

export async function invoke(args) {

    if (args.length !== 3) usage();
    return getData(args);
}

async function getData(args){
    let url = await createUrl(args[0], args[1])
    const authToken = util.getBase64(await util.getAuthKey('auth-nexus3de'));
    let latestNexus3 = await fetchLatestVersion(url, authToken, args[2])
    console.log(latestNexus3);
}

async function fetchLatestVersion(url, authToken, tmVer){
    if (!authToken) return;
    return fetch(url + "/maven-metadata.xml", {
        headers: { Accept: "application/xml", Authorization: "Basic " + authToken }
    }).then(result => {
        if(result.status !== 200) throw "HTTP Status code: " + result.status + ". " + result.statusText
        return result.text();
    }).then(textXml => {
        xml2js.parseString(textXml, function (err, res) {
            let versions = res.metadata.versioning[0]['versions'][0]['version'];
            for(let x = (versions.length-1); x >= 0; x--){
                if(isCorrectVersion(versions[x], tmVer)){
                    if((url.includes("public") || url.includes("releases")) && versions[x].match(/.+-Build\.\d+$/)){
                        textXml = versions[x];
                        break;
                    }else if((url.includes("snapshots") || url.includes("dev")) && versions[x].match(/.+-Build\.\d+.+-SNAPSHOT/)){
                        textXml = versions[x];
                        break;
                    }
                }
            }
        })
        return textXml;
    }).catch((err) => console.log(err))
}

function createUrl(branch, dependency){
    return "https://nexus3de.dieboldnixdorf.com/repository/" + chooseBranch(branch) + "/com/dieboldnixdorf/txm/" + dependency;
}

function isCorrectVersion(version, tmver){
    return version.match(new RegExp(`${tmver}-Build`));
}

function chooseBranch(branch){
    return branch.toLowerCase().startsWith("s") ? "tm-maven-dev-group" : "tm-maven-releases-group"
}
