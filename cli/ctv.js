import process from "node:process";
import {exec} from "../utils/util.js";
import fs from "node:fs"

export async function invoke(args) {
    let win = process.platform === "win32";

    let sandbox = globalThis.settings.value("sandboxes." + globalThis.settings.value("defaults.sandbox"));
	
	let binDir = sandbox.path + "/runtime/CommTraceViewer/bin";
    let execPath = binDir + '/commtraceviewer.';
    if (win) {

        if (fs.existsSync(execPath + 'bat')) {
            execPath = execPath + 'bat';
        } else  if (fs.existsSync(execPath + 'cmd')) {
            execPath = execPath + 'cmd';
        } else {
            console.log("Cant determine execute script")
            return;
        }

        await exec(execPath, binDir)
    } else {
        execPath = execPath + 'sh';
        await exec(execPath, binDir);
    }
}
