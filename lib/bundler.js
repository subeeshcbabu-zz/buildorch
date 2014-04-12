'use strict';
var async = require('async'),
	path = require('path'),
	fs = require('fs'),
	debug = require('debug')('bundler'),
	shell = require('shelljs'),
	archiver = require('archiver'),
	logger = require('./util/logger').getLogger(),
	rsync = require('rsyncwrapper').rsync;
/**
 *
 * @param options
 * sample
 * {
 *      taskname : bundle
 *      config : [Object] //Json 'bundle' config
 *      metrics : [Object] //metrics object
 * }
 * @param callback
 */
function execBundle (options, callback) {

	debug('start bundle : ' + JSON.stringify(options));

	var taskname = options.taskname,
		bundleConfig = options.config,
		metrics = options.metrics,
		execConfig = bundleConfig[taskname];

	if (execConfig.format === "custom") {
		return callback(null, bundleConfig);
	}

	var rand = Math.floor((Math.random()*1000)+1),
		source = execConfig.source || path.join(process.cwd(), 'sourcetemp' + rand),
		igList = getIgnoreList(execConfig);

	igList.unshift(source);
	igList.unshift(execConfig.target);

	rsync({
		src: process.cwd() + "/",
		dest: source,
		recursive: true,
		exclude: igList

	}, function (error, stdout, stderr, cmd) {
		if ( error ) {
			return callback(error, bundleConfig);
		} else {
			//If its just copy with excludes then exit it immediately the copy is done.
			if (execConfig.format === "copy") {
				return callback(null, bundleConfig);
			}
			// success
			if (!fs.existsSync(execConfig.target)) {
				shell.mkdir('-p', execConfig.target);
			}
			var outfile = path.join(execConfig.target, metrics.application + "." + execConfig.format),
				bundleOut = fs.createWriteStream(outfile),
				archive = archievers[execConfig.format]();

			bundleOut.on('close', function() {
				logger.info(archive.pointer() + ' total bytes');
				logger.info('Completed archive and the output file created ' + outfile);
				shell.rm('-rf', source);
				callback(null, bundleConfig);
			});

			archive.on('error', function(err) {
				callback(err, bundleConfig);
			});

			archive.pipe(bundleOut);

			archive.bulk([
				
				{ expand: true, cwd: source, src: ['**'], dest : execConfig.target }
			]);

			archive.finalize();
		}
	});
}
/**
 *
 * @param execConfig
 * @returns {Array}
 */
function getIgnoreList(execConfig) {
	var ignoreFiles = execConfig.ignorefile;
	if (!ignoreFiles || ignoreFiles.length === 0) {
		ignoreFiles = [];
	}
	ignoreFiles.unshift(path.join(__dirname, '..', 'config', '.defaultignore'));

	debug("Ignore Files : " + ignoreFiles);
	function resolvePath(list, file){
		
		return list
		.filter(function (line) {
			return !!line.trim();
		})
		.map(function (line) {
			if (line[0] === "!") {
				return "!" + path.resolve(path.dirname(file), line.substr(1).trim());
			}
			return path.join(path.dirname(file), line.trim());
		});
	}

	var ignoreList = [];
	if (Array.isArray(ignoreFiles)){
		//Using the Sync version for simple operation
		for (var i = 0; i < ignoreFiles.length ; i++ ){
			var ignoreFile = ignoreFiles[i];
			if (fs.existsSync(ignoreFile)){
				ignoreList = ignoreList.concat((ignoreFile ? shell.cat(ignoreFile) : "").split("\n"));
				debug("Ignore List : " + ignoreList.toString());
				ignoreList = resolvePath(ignoreList, ignoreFile);
			}
		}

	} else if (fs.existsSync(ignoreFiles)){

		ignoreList = (ignoreFiles ? shell.cat(ignoreFiles) : "").split("\n");
		ignoreList = resolvePath(ignoreList, ignoreFiles);
	}
	debug("Ignore List : " + ignoreList);
	return ignoreList;
	
}
/**
 *
 * @type {{tar: tar, tgz: tgz, zip: zip}}
 */
var archievers = {
	tar : function () {
		return archiver('tar');
	},
	tgz : function () {

		return archiver('tar', {
			gzip: true,
			gzipOptions: {
				level: 1
			}
		});
	},
	zip : function () {
		return archiver('zip');
	}
};

module.exports = {
	bundle: execBundle
};