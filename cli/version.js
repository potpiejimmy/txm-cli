import { createRequire } from "module";

export async function invoke() {
    const require = createRequire(import.meta.url);
    const pckg = require("../package.json");
    console.log("(C) 2018-2025 - TM Command Line Interface v" + pckg.version);
}
