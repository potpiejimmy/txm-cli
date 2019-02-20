#!/usr/bin/env node
const fetch = require("node-fetch");
const clipboardy = require("clipboardy");
const fs = require('fs');
const util = require('../utils/util');

async function invoke(args) {
    // first, use the release specified as argument
    // second, if no argument, determine the release version from the current sandbox's version.txt
    // last, if no sandbox present, use the default version
    let version = args[0] || util.determineSandboxVersion() || '19.0.10';
    return lastbn(version, args);
}

function parseNo(str,begin,end) {
	str = str.substring(str.indexOf(begin)+begin.length);
	str = str.substring(0,str.indexOf(end))
	return str;
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

async function download(result, authToken, args) {
	if (args[1] === 'd' ) {
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
	//new server has no result, try again against old server
	if(!result)
	{
		console.log("No build found for this release on new nexus server, try old one.");
		authToken = await getAuthToken('auth-davis');
        if (!authToken) return;
        url = "https://davis.wincor-nixdorf.com/nexus/service/local/repositories/snapshots/content/com/dieboldnixdorf/txm/project/fi/fi-asm-assembly/";
		result = await askServer(url, version, authToken);
	}
	
	if(result)
	{
		console.log(result.text);
		
		try { clipboardy.writeSync(">"+result.text); }
		catch (e) { console.log("Could not copy BN to clipboard: " + e); }
		
		return download(result, authToken, args);
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
	let result0;
	await fetch(url, {
		headers: {Accept: "application/json", Authorization: "Basic " + toBase64(authToken)}
	})
	.then(result => result.json())
	.then(result => {
		result = result.data.filter(i => i.resourceURI.includes(version+"-Build.")).filter(i => i.resourceURI.includes("Dev.master"));
		
		result = result.sort((a,b) => {
			let buildNoA = parseInt(parseNo(a.resourceURI,'Build.','-'));
			let buildNoB = parseInt(parseNo(b.resourceURI,'Build.','-'));
			let masterNoA = parseInt(parseNo(a.resourceURI,'master.','+'));
			let masterNoB = parseInt(parseNo(b.resourceURI,'master.','+'));

			//sort result array with latest first (highest number at index 0)
			let compare = buildNoB - buildNoA;
			return compare != 0 ? compare : masterNoB-masterNoA;
		});
				
		result0 = result[0];
		
	}).catch((err) => console.log("Can not read build version for " + version + " " + err));
	return result0;
}

module.exports.invoke = invoke;
