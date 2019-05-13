const fetch = require("node-fetch");
const clipboardy = require("clipboardy");
const fs = require('fs');
const util = require('../utils/util');

async function invoke(args) {
    // first, use the release specified as argument
    // second, if no argument, determine the release version from the current sandbox's version.txt
    // last, if no sandbox present, use the default version
    let version = args[0] || util.determineSandboxVersion() || '19.1.00';
    return lastbn(version, args);
}

async function downloadFile(url, name, size, authToken) {
	console.log("Downloading " + url + " to " + name);
	var start = new Date();
	return fetch(url, {
		headers: {Accept: "application/json", Authorization: "Basic " + toBase64(authToken)}
	})
	.then(res => new Promise((resolve,reject) => {
		const dest = fs.createWriteStream(name);
		res.body.pipe(dest);
		dest.on('finish', () => {
			const stats = fs.statSync(name)
			var end = (new Date() - start)/1000;
			console.info('Execution time: %ds', end)
			console.info('Size: ' + stats.size + ' of ' + size)
			resolve();
		});
		dest.on('error', err => reject(err));
	}));
}

async function download(result, authToken) {
	return fetch(result.resourceURI, {
		headers: {Accept: "application/json", Authorization: "Basic " + toBase64(authToken)}
	})
	.then(result => result.json())
	.then(result => {
		result = result.data.filter(i => i.resourceURI.endsWith(".zip"));
		return downloadFile(result[0].resourceURI, result[0].text, result[0].sizeOnDisk, authToken);
	})
	.catch((err) => console.log("Can not read download link for " + version + " " + err));
}

function toBase64(input) {
	let outBase64 = new Buffer.from(input).toString('base64');
	return outBase64;
}

async function lastbn(version, args) {
    let authToken = await getAuthToken('auth-nexusde');
    if (!authToken) return;
	let url = "https://nexusde.dieboldnixdorf.com/service/local/repositories/snapshots/content/com/dieboldnixdorf/txm/project/fi/fi-asm-assembly/";
	let result = await askServer(url, version, authToken);
	
	if(result)
	{
		console.log(result.text);
		
		if (args[1] === 'd' ) {
			// download artifact
			return download(result, authToken);
		} else {
			// or copy to clipboard
			try { clipboardy.writeSync(">"+result.text); }
			catch (e) { console.log("Could not copy BN to clipboard: " + e); }
		}
	}
	else {
		console.log("No build found for this release version!");
	}
}

async function getAuthToken(key) {
	let authToken = global.settings.value("config."+key);
	if (!authToken) {
		// if not set in local config, get from NPM variable:
		authToken = await util.getNPMConfigValue('txm-'+key);
		if (authToken) global.settings.setValue("config."+key, authToken);
	}
    if (!authToken) {
        console.log("Warning: No authentication token '"+key+"' found. Set it using 'tm config set "+key+" <token>'");
        return null;
	}
	return authToken;
}

async function askServer(url, version, authToken) {
	return fetch(url, {
		headers: {Accept: "application/json", Authorization: "Basic " + toBase64(authToken)}
	})
	.then(result => {
		if (result.status != 200) throw "HTTP " + result.status + " " + result.statusText;
		return result.json()
	})
	.then(result => {
		result = result.data.filter(i => 
			i.resourceURI.includes(version+"-Build.") && (
				i.resourceURI.includes("Dev.master") ||
				i.resourceURI.includes("Dev.release")
			));
		
		result = result.sort((a,b) => {
			const regex = /.*-Build\.(\d*)-Dev\..*?(\d*)\+.*/;

			let matchA = regex.exec(a.resourceURI);
			let buildNoA = parseInt(matchA[1]);
			let masterNoA = parseInt(matchA[2]);

			let matchB = regex.exec(b.resourceURI);
			let buildNoB = parseInt(matchB[1]);
			let masterNoB = parseInt(matchB[2]);

			//sort result array with latest first (highest number at index 0)
			let compare = buildNoB - buildNoA;
			return compare ? compare : masterNoB - masterNoA;
		});
				
		return result[0];
	})
	.catch((err) => console.log("Can not read build version for " + version + ": " + err));
}

module.exports.invoke = invoke;
