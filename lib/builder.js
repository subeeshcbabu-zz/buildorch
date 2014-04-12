'use strict';
var async = require('async'),
	path = require('path'),
	fs = require('fs'),
	debug = require('debug')('builder'),
	shell = require('shelljs'),
	logger = require('./util/logger').getLogger();
/**
 *
 * @param buildConfig
 * @param metrics
 * @param callback
 */
function execNpmInstall (buildConfig, metrics, callback) {
	
	//NPM Install
				
	var pkg = path.join(process.cwd(), 'package.json');
	fs.exists(pkg, function(exists){
		if (!exists) {
			logger.error("Could not find the package.json " + pkg);
			debug("No package.json");
			var err = new Error("Could not find the package.json");
			callback(err, buildConfig);
		} else {
			debug('Npm install using package.json : ' + pkg);
			var command = ( buildConfig.execbuild && buildConfig.execbuild.command ) || "npm install";
			shell.exec(command, {silent : false}, function (code, output){
				metrics.build.endtime = new Date();
				metrics.build.status = "SUCCESS";
				if (code !== 0) {
					metrics.build.status = "FAILURE";
					callback(output, buildConfig);
				} else {
					callback(null, buildConfig);
				}
			});
		}
					
	}); 
}

module.exports = {
	build: execNpmInstall
};