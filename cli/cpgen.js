const util = require('../utils/util');
const fs = require('fs');

async function invoke(args) {
    copyCpgFile("/fi-servicestation-client/etc/import", "R1400.cpg");
    copyCpgFile("/Projects/SI/Server/ServiceStation/testsrc/testfiles_daten.neu/kko", "R3768_links.cpg");
}

function copyCpgFile(srcdir, cpgfile) {
    let sbox = global.settings.value("sandboxes." + global.settings.value("defaults.sandbox"));
    srcdir = sbox.path + srcdir;
    let targetdir = sbox.path+"/runtime/fi-servicestation-client/import";
    console.log("Copying " + srcdir + "/" + cpgfile + " to " + targetdir);
    fs.copyFileSync(srcdir + "/" + cpgfile,
                    targetdir + "/" + cpgfile);
}

module.exports.invoke = invoke;
