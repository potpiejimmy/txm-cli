import fs from 'fs';
import path from 'path';
import * as util from '../utils/util.js';
import AdmZip from 'adm-zip';

export async function invoke(args) {
    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));

    if (!sbox) {
        console.log("Please configure a sandbox first.");
        return;
    }

    let win = process.platform === "win32";

    let logExpertDir = process.env.APPDATA + "\\LogExpert\\";
    let logExpertExe = logExpertDir + "LogExpert.exe";
    
    if (win) {
        // on windows, download and install LogExpert
        let downloadFileName = "LogExpert.1.9.0.zip";
        let downloadUrl = "https://github.com/LogExperts/LogExpert/releases/download/v1.9.0/" + downloadFileName;

        if (!fs.existsSync(logExpertExe)) {
            console.log("LogExpert is not installed in " + logExpertDir);

            if (!fs.existsSync(logExpertDir)) fs.mkdirSync(logExpertDir);
            let installerZip = logExpertDir + "\\" + downloadFileName;
            await util.downloadFile(downloadUrl, installerZip);

            console.log("Unzipping " + installerZip);
            new AdmZip(installerZip).extractAllTo(logExpertDir, /*overwrite*/true);

            console.log("LogExport successfully installed in " + logExpertDir);
        } else {
            console.log("LogExpert is already installed in " + logExpertDir);
        }
    }

    let relevantLogFiles = [
        sbox.path + "/scripts/buildout.log",
        sbox.path + "/scripts/dbout.log",
    ]

    let defsrv = global.settings.value("defaults.server");
    let fqdn = await util.getFullyQualifiedHostName();
   
    if (defsrv) {
        let servers = global.settings.value("servers");
        for (let server of Object.values(servers)) {
            if (server.name.startsWith(defsrv)) {
                console.log("Adding logs for server " + server.path);
                let serverName = path.basename(server.path);
                let serverLogDir = server.path + "/logs/";
                relevantLogFiles.push(serverLogDir + "messages.log");
                relevantLogFiles.push(serverLogDir + "PCELog-" + serverName + fqdn + ".prn");
                relevantLogFiles.push(serverLogDir + "CommTrace-" + serverName + fqdn + ".ctr");
            }
        }
    
    }

    console.log("Starting " + logExpertExe);
    await util.spawnDetached(win ? logExpertExe : "tail", relevantLogFiles, ".");
}
