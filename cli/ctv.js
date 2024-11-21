import * as util from '../utils/util.js';

export async function invoke(args) {
    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
	
	let execpath = sbox.path + "\\runtime\\commtraceviewer";
    let executable = execpath + "\\ctv.exe";
	let exeargs = [];
    util.spawnDetached(executable, exeargs, execpath);
}
