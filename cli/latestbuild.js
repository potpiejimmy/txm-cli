const fetch = require("node-fetch");
const util = require('../utils/util');
const xml2js = require('xml2js');

function usage() {
    console.log("Usage:  tm latestbuild <br> <dep> <ver>");
    console.log();
    console.log("  Tells you latest product build by your chosen release branch");
    console.log();
    console.log("  <br> stands for the selected release branch. public (stable) or snapshot (development)");
    console.log("  <dep> here you can specify your requested dependency. Keep this form: groupId/artifactId")
    console.log("  <ver> means your TM version. For example: 2.3, 3.0.0, 3.1.0 etc.")

    process.exit();
}

async function invoke(args) {

    if (args.length !== 3) usage();
    return await getData(args);
}

async function getData(args){
    let url = await createUrl(args[0], args[1], 2)
    let authToken = util.getBase64(await util.getAuthKey('auth-nexusde'))
    let latestNexus2 = await fetchLatestVersion(url, authToken, args[2]);
    url = await createUrl(args[0], args[1], 3)
    authToken = util.getBase64(await util.getAuthKey('auth-nexus3de'));
    let latestNexus3 = await fetchLatestVersion(url, authToken, args[2])
    console.log("Latest on Nexus2: " + latestNexus2);
    console.log("Latest on Nexus3: " + latestNexus3);
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
                    }else if(url.includes("snapshots") || url.includes("dev")){
                        textXml = versions[x];
                        break;
                    }
                }
            }
        })
        return textXml;
    })
        .catch((err) => console.log(err))
}

function createUrl(branch, dependency, nexus){
    return nexus === 2 ?
        "https://nexusde.dieboldnixdorf.com/content/repositories/" + chooseBranch(branch, nexus) + "/com/dieboldnixdorf/txm/" + dependency
        :
        "https://nexus3de.dieboldnixdorf.com/repository/" + chooseBranch(branch, nexus) + "/com/dieboldnixdorf/txm/" + dependency;
}

function isCorrectVersion(version, tmver){
    return version.includes(tmver);
}

function chooseBranch(branch, nexus){
    if(branch.toLowerCase().startsWith("s")){
        return (nexus === 2 ? "snapshots" : "tm-maven-dev-group")
    }else{
        return (nexus === 2 ? "public" : "tm-maven-releases-group")
    }
}

module.exports.invoke = invoke;