'use strict';
var async = require('async'),
	path = require('path'),
	fs = require('fs'),
	debug = require('debug')('builder'),
	shell = require('shelljs'),
	logger = require('./util/logger').getLogger(),
	format = require('./util/dateutil').format;
/**
 *
 * @param options
 * sample-
 * {
 *      taskname : build
 *      config : [Object] //Json 'build' config
 *      metrics : [Object] //metrics object
 * }
 * @param callback
 */
function execBuild (options, callback) {
	
	debug('start build : ' + JSON.stringify(options));

	var taskname = options.taskname,
		buildConfig = options.config,
		metrics = options.metrics,
		execConfig = buildConfig[taskname],
		pkg = path.join(process.cwd(), 'package.json');

	fs.exists(pkg, function(exists){
		if (!exists) {
			logger.error("Could not find the package.json " + pkg);
			debug("No package.json");
			var err = new Error("Could not find the package.json");
			callback(err, buildConfig);
		} else {
			debug('Npm install using package.json : ' + pkg);
			var command = ( execConfig && execConfig.command ) || "npm install";

			if (buildConfig.scriptprefix) {
				command = buildConfig.scriptprefix + " " + command;
			}
			
			shell.exec(command, {silent : false}, function (code, output){
				metrics.build.endtime = format(new Date());
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
	build: execBuild
};