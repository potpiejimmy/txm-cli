import * as util from '../utils/util.js';
import * as version from '../cli/version.js';

export async function invoke(args) {
    var win = process.platform === "win32";
    await util.spawn(win ? "npm.cmd" : "npm",["i","-g","txm-cli@latest"], process.cwd());
    await version.invoke();
}
