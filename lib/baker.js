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
 * @param bakeConfig
 * @param metrics
 * @param callback
 */
function execbake (bakeConfig, metrics, callback) {
	var gruntF = path.join(process.cwd(), 'Gruntfile.json'),
		gruntf = path.join(process.cwd(), 'gruntfile.json'),
		exists = fs.existsSync(gruntF) || fs.existsSync(gruntf);
	
	var config = bakeConfig.execbake,
		command = config.command;

	if (!exists) {
		//PRINT the Info
		debug("No Grunt file");
		//Override the commadn to use npm run-script
		command = "npm run-script";
	} 
	
	var tasks = getTasks(command, config, metrics.bake);

	async.waterfall(tasks, function (err, results) {
		callback && callback(err);
	});
}

/**
 * Get the task list based on config
 * @param command
 * @param config
 * @param metrics
 * @returns {Array}
 */
function getTasks (command, config, metrics) {
	var tasks = [], defaultTasks = ['lint', 'unittest', 'coverage', 'custom'];
	debug('get task for command: ' + command + ' config :' + JSON.stringify(config) );

	Object.keys(config).forEach(function (key) {
		debug('Find the task fn for task : ' + key);
		if (defaultTasks.indexOf(key) !== -1 && config[key]) {
			tasks.push(function(){
				return function (config, metrics, callback){
					debug ('config : ' + JSON.stringify(config) + 
						' metrcis: ' + JSON.stringify(metrics));
					metrics[key] = {};
					metrics[key].starttime = format(new Date());
					logger.info("[ bake : " + key + ": start ]");

					shell.exec( command + ' ' + config[key], function (code, output){
						metrics[key].endtime = format(new Date());
						logger.info("[ bake : "+ key + ": end ]");
						if (code === 0) {
							metrics[key].status = "SUCCESS";
							callback(null, config, metrics);
						} else {
							metrics[key].status = "FAILURE";
							debug("Task " + "key "+ "errored out : " + output);
							callback(output, config, metrics);
						}
					});
				};

			}());
		}
	});
	//Insert the Function to pass Config, at the top of the task list
	tasks.unshift(function (callback){
		callback(null, config, metrics);
	});

	return tasks;
}

module.exports = {
	bake: execbake
};