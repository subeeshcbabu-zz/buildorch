'use strict';
var async = require('async'),
	path = require('path'),
	fs = require('fs'),
	debug = require('debug')('baker'),
	shell = require('shelljs'),
	logger = require('./util/logger').getLogger(),
	format = require('./util/dateutil').format;

/**
 *
 * @param options
 * sample -
 * {
 *      taskname : bake
 *      config : [Object] //Json 'bake' config
 *      metrics : [Object] //metrics object
 * }
 * @param callback
 */
function execbake (options, callback) {
	var gruntF = path.join(process.cwd(), 'Gruntfile.js'),
		gruntf = path.join(process.cwd(), 'gruntfile.js'),
		exists = fs.existsSync(gruntF) || fs.existsSync(gruntf);

	debug('start bake : ' + JSON.stringify(options));
	
	var taskname = options.taskname,
		bakeConfig = options.config,
		metrics = options.metrics,
		execConfig = bakeConfig[taskname],
		command = bakeConfig.command;

	if (!exists) {
		//PRINT the Info
		debug("No Grunt file");
		//Override the commadn to use npm run-script
		command = "npm run-script";
	} else {
		//Check if Grunt CLI is already installed or not.
		if (! fs.existsSync(command)) {

			var res, installVer = "npm install " + bakeConfig.gruntcli;
			debug("Install Grunt CLI " + installVer);
			res = shell.exec(installVer, {silent : false});

		}

	}
	
	var tasks = getTasks(command, execConfig, metrics.bake);

	async.waterfall(tasks, function (err, results) {
		callback && callback(err, bakeConfig);
	});
}

/**
 * Get the task list based on config
 * @param command
 * @param execConfig
 * @param metrics
 * @returns {Array}
 */
function getTasks (command, execConfig, metrics) {
	var tasks = [], defaultTasks = ['lint', 'unittest', 'coverage', 'custom'];
	debug('get task for command: ' + command + ' execConfig :' + JSON.stringify(execConfig) );

	Object.keys(execConfig).forEach(function (key) {
		debug('Find the task fn for task : ' + key);
		if (defaultTasks.indexOf(key) !== -1 && execConfig[key]) {
			tasks.push(function(){
				return function (execConfig, metrics, callback){
					debug ('execConfig : ' + JSON.stringify(execConfig) + 
						' metrcis: ' + JSON.stringify(metrics));
					metrics[key] = {};
					metrics[key].starttime = format(new Date());
					logger.info("[ bake : " + key + ": start ]");
					shell.exec( command + ' ' + execConfig[key], function (code, output){
						metrics[key].endtime = format(new Date());
						logger.info("[ bake : "+ key + ": end ]");
						if (code === 0) {
							metrics[key].status = "SUCCESS";
							callback(null, execConfig, metrics);
						} else {
							metrics[key].status = "FAILURE";
							debug("Task " + "key "+ "errored out : " + output);
							callback(output, execConfig, metrics);
						}
					});
				};

			}());
		}
	});
	//Insert the Function to pass Config, at the top of the task list
	tasks.unshift(function (callback){
		callback(null, execConfig, metrics);
	});

	return tasks;
}

module.exports = {
	bake: execbake
};