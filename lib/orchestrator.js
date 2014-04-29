'use strict';
var b3config = require('./b3config'),
	async = require('async'),
	path = require('path'),
	fs = require('fs'),
	debug = require('debug')('orchestrator'),
	logutil = require('./util/logger'),
	logger = logutil.getLogger(),
	shell = require('shelljs'),
	baker = require('./baker'),
	builder = require('./builder'),
	bundler = require('./bundler'),
	os = require('os'),
	format = require('./util/dateutil').format;
/**
 *
 * @constructor
 */
function Orchestrator (){
	//The list of errors
	this.errors = [];
	//The list of top level steps to be executes
	this.steps = [];
	//The JSON metrics object
	this.metrics = Object.create(null);
}

/**
 *
 * @type {{_getConfig: _getConfig, _cacheConfig: _cacheConfig, loadConfig: loadConfig, task: task}}
 */
Orchestrator.prototype = {

	/**
	 * Get the config from b3config.
	 * @param cb
	 * @private
	 */
	_getConfig : function (cb) {
		if (this._config) {
			cb(null, this._config);
		} else {
			b3config.create(cb);
		}
	},
	/**
	 * Cache the config from b3config to save to the this._config
	 * @param config
	 * @private
	 */
	_cacheConfig : function (config) {
		if (!this._config && config) {
			this._config = config;
		}
	},
	/**
	 * Load the config from b3config and retrieve the task specifc config.
	 * @param task
	 * @param cb
	 * @private
	 */
	loadConfig : function (task, cb) {
		var that = this;
		this._getConfig(function (err, config){
			if (err) {
				that.errors.push(err);
				logger.error("Could not load buildorch config from JSON");
				return cb(err, null);
			}

			that._cacheConfig(config);
			var	taskConfig = config && config.get(task);
			debug(task +' config : ' + JSON.stringify(taskConfig));
			cb(err, taskConfig);
					
		});	
	},
	/**
	 * The task executer
	 * @param taskname
	 * @param cb
	 */
	task : function task(taskname, cb) {
		var that = this;
		logutil.startTask(logger, "[ " + taskname + ": start ]");
		
		that.metrics[taskname] = {};
		that.metrics[taskname].startTime = format(new Date());
		that.loadConfig(taskname, function(err, taskConfig){
			//err && that.errors.push(err);
			if (!err) {
				var tasks = getTasks(that, taskConfig);
				async.waterfall(tasks, function (err, config) {
					logutil.endTask(logger, "[ "+ taskname + ": end ]");
					that.metrics[taskname].endtime = format(new Date());
					err && that.errors.push(err);
					that.metrics[taskname].status = "SUCCESS";
					if (that.errors && that.errors.length > 0) {
						that.metrics[taskname].status = "FAILURE";
					}
					cb && cb(err);
					
				});
			} else {
				
				logutil.endTask(logger, "[ "+ taskname + ": end]");
				that.metrics[taskname].endtime = format(new Date());
				that.metrics[taskname].status = "SUCCESS";
				if (that.errors && that.errors.length > 0) {
					that.metrics[taskname].status = "FAILURE";
				}
				cb && cb(err);
			}
			
		});
	}
};
/**
 * List of executors
 * @type {{clean: cleanup, script: execCustomScript, execbuild: build, execbake: bake,
 * 					execbundle: bundle, write: writeMetrics}}
 */
var executors = {
	clean : cleanup,
	preclean : cleanup,
	postclean : cleanup,
	script :  execCustomScript,
	prescript : execCustomScript,
	postscript: execCustomScript,
	execbuild : builder.build,
	execbake : baker.bake,
	execbundle : bundler.bundle,
	write : writeMetrics
};

/**
 * Get the task list based on config
 * @param caller
 * @param config
 * @returns {Array}
 */
function getTasks (caller, config) {
	var tasks = [];
	/**
	 * The envelope function to add the args and callback
	 * @param taskFn
	 * @returns {Function}
	 */
	function envelope (key, taskFn) {
		/**
		 * `config` is passed over to the next function in the waterfall.
		 */
		return function (config, callback) {
			var options = {
				taskname : key,
				config : config,
				metrics : caller.metrics
			};
			taskFn.call(caller, options, callback);
		};
	}
	var keys = Object.keys(config);
	//Sort the keys
	

	debug('Before sort ' + keys);
	keys = keys.sort(function(first, second) {
		
		return taskRegistry.indexOf(first) - taskRegistry.indexOf(second);
	});

	debug('After sort ' + keys);

	keys.forEach(function (key) {
		if (executors[key]) {
			tasks.push(envelope(key, executors[key]));
		}
	});
	/**
	 * Insert the Function to pass Config, at the top of the task list
	 */
	tasks.unshift(function (callback){
		callback(null, config);
	});

	return tasks;
}
/**
 *
 * @param config
 * @param metrics
 * @param cb
 * 
 */
function writeMetrics (config, metrics, errors, cb) {
	var metricsFile = config.write.outfile;
	logger.info("[ metrics : start ]");
	metrics.endtime = format(new Date());
	metrics.status = "SUCCESS";
	if (errors && errors.length > 0) {
		metrics.status = "FAILURE";
	}

	var metricsStr = JSON.stringify(metrics, null, 2);
	debug("Metrics file : " + metricsFile);
	debug("Metrics : " + metricsStr);
	if (metrics) {
		logger.info("Writing to file " + metricsFile);
		var file_encoding = process.env.FILE_ENCODING || 'utf-8';
		fs.writeFile(metricsFile, metricsStr, { encoding : file_encoding }, function (err){

			logger.info("[ metrics : end ]");
			logutil.endTask(logger, "Buidorch tasks completed at " + metrics.endtime + " with status " + metrics.status);
			cb && cb(err);
		});
	} else {
		logger.info("[ metrics : end ]");
		logutil.endTask(logger, "Buidorch tasks completed at " + metrics.endtime + " with status " + metrics.status);
		cb && cb(null);
	}
}
/**
 *
 * @param config
 * @param metrics
 * @param cb
 */
function cleanup (options, cb) {

	var taskname = options.taskname,
		config = options.config,
		files = config[taskname];

	debug('Cleaning up files : ' + files);
	//Return if files empty
	if (!files || files.length === 0 ) {
		cb && cb(null, config);
		return;
	}
	logger.info("[ "+ taskname +" ] " + files);
	var rmRes;
	if (Array.isArray(files)){
		//Using the Sync version for CleanUp
		for (var i = 0; i < files.length ; i++ ){
			rmRes = shell.rm('-rf', files[i]);
		}
			
	} else {
		rmRes = shell.rm('-rf', files);
	}
	cb && cb(null, config);
}
/**
 *
 * @param options
 * @param cb
 */
function execCustomScript (options, cb) {
	
	var taskname = options.taskname,
		config = options.config,
		script = config[taskname];

	//Return if files empty
	if (!script) {
		cb && cb(null, config);
		return;
	}
	logger.info("[ "+ taskname +" ] " + script);
	fs.exists(script, function(exists){
		if (exists) {
			shell.chmod('+x', script);
			if (config.scriptprefix) {
				script = config.scriptprefix + " " + script;
			}
			debug('Executing the Custom Script : ' + script);
			logger.info('Executing the Custom Script : ' + script);
			shell.exec(script, {silent: false}, function(code, output){
				if (code === 0) {
					//logger.info(output);
					cb && cb(null, config);
				} else {
					//logger.error(output);
					cb && cb(output, config);
				}
			});
				
		} else {
			cb && cb(null, config);
		}
	});
}
/**
 * 
 * @param metrics
 */
function updateBasicMetrics(metrics) {
	// Update the basic info for metrics
	metrics.userid = process.env.USER;
	metrics.machine = os.hostname();
	metrics.nodejsVersion = process.version;
	
	var pkg = path.join(process.cwd(), 'package.json'),
		builderPkg = path.join(process.cwd(),'node_modules', 'buildorch', 'package.json');
	if (fs.existsSync(pkg)){
		metrics.application = require(pkg).name;
	}

	if (fs.existsSync(builderPkg)){
		metrics.builderVersion = process.env.SCRIPT_VERSION || require(builderPkg).version;
	}

	metrics.starttime = format(new Date());
	logutil.startTask(logger, "Buidorch tasks started at " + metrics.starttime);
}
/**
 * Task Registry. Used For sorting the Job Order
 * @type {string[]}
 */
var taskRegistry = [ "preclean", "clean", "files", "prescript",
					 "script", "execbuild", "execbake", "execbundle",
					 "postscript", "postclean"];
/**
 * 
 * @param tasks
 * @param cb
 */
function execTask (tasks, cb){

	var orch = new Orchestrator();
	updateBasicMetrics(orch.metrics);
	
	orch.steps = tasks;
	orch.steps.unshift('init');
	
	debug('Executing the tasks ' + tasks);
	orch.steps = orch.steps.map(function mapper(task){
		return function(callback) {
			orch.task(task, callback);
		};
	});
	
	//Execute init and build
	async.series(orch.steps, function (error, results) {	
		orch.loadConfig('metrics', function(err, metricsConfig){
			if (!err) {
				writeMetrics(metricsConfig, orch.metrics, orch.errors, function(err){
					err && orch.errors.push(err);
					cb && cb(orch.errors);
				});
			} else {
				orch.errors.push(err);
				cb && cb(orch.errors);
			}

		});
	});
}

/**
 * 
 * @param tasks
 * @param cb
 */
function execTaskSync (tasks, outfile){
	
	var orch = new Orchestrator(); 

	updateBasicMetrics(orch.metrics);
	
	orch.steps = tasks;
	orch.steps.unshift('init');
	
	debug('Executing the tasks ' + tasks);
	orch.steps = orch.steps.map(function mapper(task){
		return function(callback) {
			orch.task(task, callback);
		};
	});
	/**
	 * Write the exit code to outfile.
	 * @param exitcode
	 */
	function writeExitCode (exitcode) {
		var file_encoding = process.env.FILE_ENCODING || 'utf-8';
		fs.writeFileSync(outfile, exitcode, { encoding : file_encoding });
	}

	// TODO Implement Invoking Error Code Registry to get the Error Codes
	function getExitCode(errors) {
		var exitcode = 0;
		if (errors) {
			if (Array.isArray(errors)) {
				exitcode = (errors.length > 0) ? 1: 0;
			} else {	
				exitcode = 1;
			}
		}
		return exitcode;
	}

	//Execute init and build
	async.series(orch.steps, function (error, results) {
		//TODO
		// Log the error seperately here
		//
		orch.loadConfig('metrics', function(err, metricsConfig){
			if (!err) {
				writeMetrics(metricsConfig, orch.metrics, orch.errors, function(err){
					err && orch.errors.push(err);
					outfile && writeExitCode(getExitCode(orch.errors));
				});
			} else {
				err && orch.errors.push(err);
				outfile && writeExitCode(getExitCode(orch.errors));
			}
		});
	});


}

module.exports = {
	exec : execTask,
	execSync : execTaskSync
};
