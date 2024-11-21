import * as util from '../utils/util.js';

export async function invoke(args) {
    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    var win = process.platform === "win32";
    await util.spawn(win ? "gradlew.bat" : "./gradlew",['build'], sbox.path);
}
