'use strict';
var b3config = require('./b3config'),
	async = require('async'),
	path = require('path'),
	fs = require('fs'),
	debug = require('debug')('orchestrator'),
	log4js = require('log4js'),
	logger = log4js.getLogger("Build"),
	shell = require('shelljs'),
	baker = require('./baker'),
	builder = require('./builder'),
	bundler = require('./bundler'),
	os = require('os');

function Orchestrator (){
	
	this._errors = [];
	this._metrics = Object.create(null);
	this.steps = [];
	
}

Orchestrator.prototype = {

	_getConfig : function (cb) {
		if (this._config) {
			cb(null, this._config);
		} else {
			b3config.create(cb);
		}
	},
	_cacheConfig : function (config) {
		if (!this._config && config) {
			this._config = config;
		}
	},
	_loadConfig : function (task, cb) {
		var that = this;
		this._getConfig(function (err, config){
			if (err) {
				// TODO Error handling
				that._errors.push(err);
			}

			that._cacheConfig(config);
			var	taskConfig = config && config.get(task);
			debug(task +' config : ' + JSON.stringify(taskConfig));
			cb(err, taskConfig);
					
		});	
	},
	/*
	* Execute the task
	*/
	task : function task(task, cb) {
		var that = this;
		logger.info(" ");
		logger.info("[ " + task + ": start ]");
		that._metrics[task] = {};
		that._metrics[task].startTime = new Date();

		that._loadConfig(task, function(err, taskConfig){
			
			if (!err) {
				var tasks = getTasks(that, taskConfig);
				async.waterfall(tasks, function (err, config) {
					logger.info("[ "+ task + ": end]");
					that._metrics[task].endtime = new Date();
					cb && cb(err);
					
				})
			} else {
				logger.info("[ "+ task + ": end]");
				that._metrics[task].endtime = new Date();
				cb && cb(err);
			}
			
		});
	}
};
/*
* The list of executors
*/
var executors = {
	clean : cleanup,
	script :  execCustomScript,
	execbuild : builder.build,
	execbake : baker.bake,
	execbundle : bundler.bundle,
	write : writeMetrics
};

/*
* Get the task list based on config
*/
function getTasks (caller, config) {
	var tasks = [];
	/*
	* The envelope function to add the args and callback
	*/
	function envelope (taskFn) {
		return function (config, callback) {
			taskFn.call(caller, config, caller._metrics, callback)
		}
	}
	Object.keys(config).forEach(function (key) {
		if (executors[key]) {
			tasks.push(envelope(executors[key]));
		}
	});
	//Insert the Function to pass Config, at the top of the task list
	tasks.unshift(function (callback){
		callback(null, config);
	})

	return tasks;
}

function writeMetrics (config, metrics, cb) {
	var that = this,
		metricsFile = config.write.outfile;
	
	metrics.endtime = new Date();
	metrics.status = "SUCCESS";
	if (that._errors && that._errors.length > 0) {
		metrics.status = "FAILURE"
	}

	var metricsStr = JSON.stringify(metrics, null, 2);
	debug("Metrics file : " + metricsFile);
	debug("Metrics : " + metricsStr);
	if (metrics) {
		fs.writeFile(metricsFile, metricsStr, function (err){
			cb && cb(err);
		});
	} else {
		cb && cb(null);
	}
}

function cleanup (config, metrics, cb) {
	var files = config.clean;
	debug('Cleaning up files : ' + files);
		
	//Return if files empty
	if (!files || files.length === 0 ) {
		cb && cb(null, config);
		return;
	}
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

function execCustomScript (config, metrics, cb) {
	var script = config.script;
	debug('Executing the Custom Script : ' + script);
	//Return if files empty
	if (!script) {
		cb && cb(null, config);
		return;
	}
	fs.exists(script, function(exists){
		if (exists) {
			//TODO Change to async exec
			shell.exec(script, function(code, output){
				if (code === 0) {
					cb && cb(null, config);
				} else {
					cb && cb(output, config);
				}
			});
				
		} else {
			cb && cb(null, config);
		}
	});
}



function execTask (tasks, cb){
	
	var orch = new Orchestrator();
	// Update the basic info for metrics
	orch._metrics.userid = process.env.USER;
	orch._metrics.machine = os.hostname();
	orch._metrics.starttime = new Date();
	var pkg = path.join(process.cwd(), 'package.json');
	if (fs.existsSync(pkg)){
		orch._metrics.application = require(pkg).name;
	}
	orch.steps = tasks;
	orch.steps.unshift('init');
	orch.steps.push('metrics');
	debug('Executing the tasks ' + tasks);
	orch.steps = orch.steps.map(function mapper(task){
		return function(callback) {
			orch.task(task, callback);
		};
	});
	
	//Execute init and build
	async.series(orch.steps, function (err, results) {

		cb && cb();
	});
}

module.exports = {
	exec : execTask
};
