const fetch = require("node-fetch");
const util = require('../utils/util');

function usage() {
    console.log("Usage:  tm changelog <br> <dep> <ver>");
    console.log();
    console.log("  Tells you changelog for a artifact on your chosen branch and version.");
    console.log();
    console.log("  <br> stands for the selected release branch. public (stable) or snapshot (development)");
    console.log("  <dep> here you can specify your requested dependency. Keep this form: groupId/artifactId")
    console.log("  <ver> has to be exact version. For example: 2.3.0-Build.1337 - Please keep this in mind.")

    process.exit();
}

async function invoke(args) {
    if (args.length !== 3) usage();
    return await getData(args);
}

async function getData(args) {
    let url = await createUrl(args[0], args[1], args[2])
    let changelogFileName = args[1].replace(/.+\//, "") + "-" + args[2] + "-changelog.json"
    let authToken = util.getBase64(await util.getAuthKey('auth-nexusde'))
    let changelogs = JSON.parse(await fetchLatestVersion(url, authToken, changelogFileName, args[2])).changeLog[args[2]];
    for(let entry in changelogs){
        const changelogEntry = changelogs[entry];
        let issueCode = changelogEntry.issues
        console.log("----- Changelog Entry " + (parseInt(entry)+1) + " -----" )
        console.log("Issue code: " + issueCode)
        let replacement = new RegExp( issueCode + ":?( |\s)", "gmi")
        console.log("Message: " + changelogEntry.message.replace(replacement, ""))
    }
}

async function fetchLatestVersion(url, authToken, changelogFile) {
    if (!authToken) return;
    return fetch(url + "/" + changelogFile, {
        headers: {Accept: "application/json", Authorization: "Basic: " + authToken}
    }).then(result => {
        if (result.status !== 200) throw "HTTP Status code: " + result.status + ". " + result.statusText
        return result.text();
    })
        .catch((err) => console.log(err))
}

function createUrl(branch, dependency, version) {
    return "https://nexusde.dieboldnixdorf.com/content/repositories/" + chooseBranch(branch) + "/com/dieboldnixdorf/txm/" + dependency + "/" + version;
}

function chooseBranch(branch) {
    if (branch.toLowerCase().startsWith("s")) {
        return "snapshots"
    } else {
        return "public"
    }
}

module.exports.invoke = invoke;