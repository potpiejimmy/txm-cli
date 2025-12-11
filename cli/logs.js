import fs from 'fs';
import * as util from '../utils/util.js';
import AdmZip from 'adm-zip';

function addTMLogFile(logDir, prefix, suffix, logFiles) {
    let foundFile = fs.readdirSync(logDir).find(file => file.startsWith(prefix) && file.endsWith(suffix));
    if (foundFile) logFiles.push(logDir + foundFile);
}

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
   
    if (defsrv) {
        let servers = global.settings.value("servers");
        for (let server of Object.values(servers)) {
            if (server.name.startsWith(defsrv)) {
                console.log("Adding logs for server " + server.path);
                let serverLogDir = server.path + "/logs/";
                relevantLogFiles.push(serverLogDir + "messages.log");
                if (server.type !== 'kko') {
                    if (fs.existsSync(serverLogDir)) {
                        addTMLogFile(serverLogDir, "PCELog-", ".prn", relevantLogFiles);
                        addTMLogFile(serverLogDir, "CommTrace-", ".ctr", relevantLogFiles);
                    }
                }
            }
        }
    
    }

    console.log("Starting " + logExpertExe);
    await util.spawnDetached(win ? logExpertExe : "tail", relevantLogFiles, ".");
}
