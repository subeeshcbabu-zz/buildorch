'use strict';
var async = require('async'),
	path = require('path'),
	fs = require('fs'),
	debug = require('debug')('bundler'),
	shell = require('shelljs'),
	archiver = require('archiver'),
	logger = require('./util/logger').getLogger();
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

	logger.info("Bundle format : " + execConfig.format);

	if (execConfig.format === "custom") {
		return callback(null, bundleConfig);
	}

	var rand = Math.floor((Math.random()*10000)+1),
		source = execConfig.source || path.join(shell.tempdir(), 'sourcetemp' + rand),
		excludeSource = path.relative(process.cwd(), source) || source;

	//Clean up the Target Directory
	if (fs.existsSync(execConfig.target)) {
		shell.rm('-rf', execConfig.target);
	}
	//Create source dir it does not exists
	if (!fs.existsSync(source)) {
		shell.mkdir('-p', source);
	}
    /**
     *  Invoke the Rsync
     */
    var cmd = 'rsync -arl --exclude ' + excludeSource + ' --exclude ' + execConfig.target +
		 ' ' + getIgnoreList(execConfig) + ' ' + process.cwd() + '/' +
		 ' ' + source;

    debug("Rsync command " + cmd);

	shell.exec(cmd, function (code, output) {

		if ( code !== 0) {
			return callback(output, bundleConfig);
		} else {
			//If its just copy with excludes then exit it immediately the copy is done.
			if (execConfig.format === "copy") {
				logger.info("Copied files to " + source);
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
	var files = [];
	var ignoreFiles = execConfig.ignorefile;
	if (!ignoreFiles || ignoreFiles.length === 0) {
		ignoreFiles = [];
	}
	if (!fs.existsSync(path.resolve(process.cwd()))){
		shell.cp(path.join(__dirname, '..', 'config', '.defaultignore'), path.resolve(process.cwd()));
	}
	
	ignoreFiles.unshift(path.join(process.cwd(), '.defaultignore'));
	debug("Ignore Files : " + ignoreFiles);

	ignoreFiles = ignoreFiles.map(function(file){

		if (fs.existsSync(file)){
			return "--exclude-from " + file;
		} else {
			return "";
		}

	});
	return ignoreFiles.join(" ");
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