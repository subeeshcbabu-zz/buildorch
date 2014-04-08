'use strict';
var async = require('async'),
	path = require('path'),
	fs = require('fs'),
	debug = require('debug')('builder'),
	shell = require('shelljs');

function execNpmInstall (buildConfig, metrics, callback) {
	
	//NPM Install
				
	var pkg = path.join(process.cwd(), 'package.json');
	fs.exists(pkg, function(exists){
		if (!exists) {
			//PRINT the error
			debug("No package.json");
			callback(null, buildConfig);
		} else {
			debug('Npm install using package.json : ' + pkg);
			var command = ( buildConfig.execbuild && buildConfig.execbuild.command ) || "npm install";
			shell.exec(command, function (code, output){
				metrics.build.endtime = new Date();
				metrics.build.status = "SUCCESS";
				if (code !== 0) {
					metrics.build.status = "FAILURE";
				}
				callback(null, buildConfig);
			});
		}
					
	}); 
}

module.exports = {
	build: execNpmInstall
};