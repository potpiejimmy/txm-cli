const fetch = require("node-fetch");
const util = require('../utils/util');
const xml2js = require('xml2js');

function usage() {
    console.log("Usage:  tm latestbuild <branch> <dependency>");
    console.log();
    console.log("  Tells you latest product build by your chosen release branch \w changelogs.");
    console.log();
    console.log("  <branch> stands for the selected release branch. release or snapshot");
    console.log("  <dependency> here you can specify your requested dependency. Keep this form: groupId/artifactId")

    process.exit();
}

async function invoke(args) {

    if (args.length !== 2) usage();
    return await getData(args);
}

async function getData(args){
    let url = await createUrl(args[0], args[1])
    let authToken = util.getBase64(await util.getAuthKey('auth-nexusde'))
    let latestVersion = fetchLatestVersion(url, authToken);
}

async function fetchLatestVersion(url, authToken){
    if (!authToken) return;
    return fetch(url + "/maven-metadata.xml", {
        headers: { Accept: "application/xml", Authorization: "Basic: " + authToken }
    }).then(result => {
        if(result.status !== 200) throw "HTTP Status code: " + result.status + ". " + result.statusText
        return result.xml;
    }).then(xml => {
        xml2js.Parser().parse(xml)
    })
}

async function fetchChangelog(){

}

async function createUrl(branch, dependency){
    let br = chooseBranch(branch);
    let url = "https://nexusde.dieboldnixdorf.com" + chooseBranch(branch) + "content/com/dieboldnixdorf/txm/" + dependency;
}

function chooseBranch(branch){
    if(branch.toLowerCase().startsWith("re")){
        return "";
    }
    return "";
}

module.exports.invoke = invoke;