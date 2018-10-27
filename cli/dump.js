async function invoke(args) {
    console.log(global.settings.all());
}

module.exports.invoke = invoke;
