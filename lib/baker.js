'use strict';
var async = require('async'),
	path = require('path'),
	fs = require('fs'),
	debug = require('debug')('baker'),
	shell = require('shelljs'),
	logger = require('./util/logger').getLogger(),
	format = require('./util/dateutil').format,
	validator = require('./util/validateutil');

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
	var skipGruntBuild = validator.skipGruntBuild();

	debug('start bake : ' + JSON.stringify(options));
	
	var taskname = options.taskname,
		bakeConfig = options.config,
		metrics = options.metrics,
		execConfig = bakeConfig[taskname],
		command = bakeConfig.command;

	if (skipGruntBuild) {
		//PRINT the Info
		debug("No Grunt file");
		//Override the commadn to use npm run-script
		command = "npm run-script";
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

	var keys = Object.keys(execConfig);
	
	debug('Before sort ' + keys);
	keys = keys.sort(function(first, second) {
		
		return defaultTasks.indexOf(first) - defaultTasks.indexOf(second);
	});
	debug('After sort ' + keys);

	keys.forEach(function (key) {
		/**
		* Get the config for the task
		* "lint" : {
		*		"task" : "lint",
		*			"skip" : "env:SKIP_LINT",
		*			"failonerror" : true
		*		}
		*/
		var details = execConfig[key];
		debug('Find the task fn for task : ' + key + "  " + details);

		if (details) {
			var task = details.task,
				skip = details.skip,
				failonerror = details.failonerror;
			/**
			 * Check if "skip" set to true or not.
			 */
			if (task && !skip) {
				
				tasks.push(function(){
					return function (execConfig, metrics, callback){
						debug ('execConfig : ' + JSON.stringify(execConfig) + 
							' metrcis: ' + JSON.stringify(metrics));
						metrics[key] = {};
						metrics[key].starttime = format(new Date());
						logger.info("[ bake : " + key + ": start ]");
						shell.exec( command + ' ' + task, function (code, output){
							metrics[key].endtime = format(new Date());
							logger.info("[ bake : "+ key + ": end ]");
							if (code === 0) {
								metrics[key].status = "SUCCESS";
								callback(null, execConfig, metrics);
							} else {
								metrics[key].status = "FAILURE";
								debug("Task " + key + "errored out : " + output);
								/**
								 * Check if Fail on Error is set or not.
								 */
								if (!failonerror) {
									output = null;
								}
								callback(output, execConfig, metrics);
							}
						});
					};

				}());
			}
			
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