import * as util from '../utils/util.js';
import * as db from './db.js';

export async function invoke(args) {
    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    let defsrv = global.settings.value("defaults.server");
    if (!sbox || !defsrv) {
        console.log("Please configure default server(s) and sandbox first.");
        return;
    }

    console.log("Running Automatiktest on sandbox '" + sbox.path + "' against server(s) '" + defsrv + "'");
    console.log("*** Warning: This will remove all data in the database at " + db.getDBConnectionString() + " ***");
    console.log("Press enter to continue or Ctrl+C to abort.");
    await util.pressEnter();
    console.log("Running Automatiktest.");
}
