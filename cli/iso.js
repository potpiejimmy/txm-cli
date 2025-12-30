import fs from 'fs';
import * as util from '../utils/util.js';
import AdmZip from 'adm-zip';

export async function invoke(args) {

    const appDataDir = process.platform === 'win32'
        ? process.env.APPDATA
        : process.platform === 'darwin'
            ? process.env.HOME + '/Library/Application Support'
            : process.env.HOME + '/.config';  // Linux/Unix

    let isobuilderDir = appDataDir + "/isobuilder/";
    let isobuilderStartHtml = isobuilderDir + "README.html";
    
    // download and install isobuilder
    let downloadFileName = "isobuilder-1.0.0.zip";
    let downloadUrl = "https://github.com/potpiejimmy/isobuilder-next/releases/download/v1%2C0.0/" + downloadFileName;

    if (!fs.existsSync(isobuilderStartHtml)) {
        console.log("isobuilder is not installed in " + isobuilderDir);

        if (!fs.existsSync(isobuilderDir)) fs.mkdirSync(isobuilderDir);
        let installerZip = isobuilderDir + downloadFileName;
        await util.downloadFile(downloadUrl, installerZip);

        console.log("Unzipping " + installerZip);
        new AdmZip(installerZip).extractAllTo(isobuilderDir, /*overwrite*/true);

        console.log("isobuilder successfully installed in " + isobuilderDir);
    } else {
        console.log("isobuilder is already installed in " + isobuilderDir);
    }

    console.log("Opening " + isobuilderStartHtml);

    console.log("Note: You may configure your default browser for opening URLs like this: 'tm c set DefaultBrowser firefox'");
    let browser = global.settings.value("config.DefaultBrowser");

    await util.openUrl(isobuilderStartHtml, browser);
}
