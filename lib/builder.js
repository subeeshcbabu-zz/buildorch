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
		command,
		tasks,
		pkg = path.join(process.cwd(), 'package.json');

	command = ( execConfig && execConfig.command ) || "";

	tasks = getTasks(command, execConfig, metrics.build);

	async.waterfall(tasks, function (err, results) {
		callback && callback(err, buildConfig);
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
	var tasks = [], defaultTasks = ['npm', 'bower' ];
	debug(' execConfig :' + JSON.stringify(execConfig) );

	var keys = Object.keys(execConfig);
	
	debug('Before sort ' + keys);
	keys = keys.sort(function(first, second) {
		
		return defaultTasks.indexOf(first) - defaultTasks.indexOf(second);
	});
	debug('After sort ' + keys);

	keys.forEach(function (key) {
		/**
		* Get the config for the task
		* "npm" : {
		*		"task" : "npm install",
		*		"skip" : "env:SKIP_NPM",
		*		"failonerror" : true
		*	}
		*/
		var details = execConfig[key];
		debug('Find the task fn for task : ' + key + "  " + details);

		if (details) {
			var task = details.task,
				taskCommand = details.command,
				skip = details.skip,
				failonerror = details.failonerror,
				finalExec;
			/**
			 *  npm install module_name
			 *  node_modules/module_name/bin/cli command
			 *  node_modules/bower/bin/bower install
			 */
			finalExec = (taskCommand) ? (command + " " + taskCommand + " " + task) : (command + " " + task);
			debug('Final exec : ' + finalExec);
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
						logger.info("[ build : " + key + ": start ]");
						shell.exec( finalExec, function (code, output){
							metrics[key].endtime = format(new Date());
							logger.info("[ build : "+ key + ": end ]");
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
	build: execBuild
};