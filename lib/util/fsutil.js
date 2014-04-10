"use strict";
var fs = require('fs'),
	path = require('path'),
	async = require('async'),
	shell = require('shelljs'),
	debug = require('debug')('fsutil'),
	minimatch = require('minimatch');

module.exports = {
	copy: copy,
	copydir: copydir
};

/**
 *
 * @param fp
 * @param patterns
 * @returns {*}
 */
function isIgnored(fp, patterns) {

	debug("isIgnored : " + fp + " : in list : " + patterns);
	return patterns.some(function (ip) {
		if (minimatch(path.resolve(fp), ip, { nocase: true })) {
			debug("minimatch :" + fp + " : " + ip);
			return true;
		}
		if (path.resolve(fp) === ip) {
			debug("path resolve :" + fp + " : " + ip);
			return true;
		}
		if (shell.test("-d", fp) && ip.match(/^[^\/]*\/?$/) &&
			fp.match(new RegExp("^" + ip + ".*"))) {
			debug("Regex test :" + fp + " : " + ip);
			return true;
		}
	});
}

/**
 *
 * @param src
 * @param dest
 * @param ignorelist
 * @param cb
 */
function copy(src, dest, ignorelist, cb) {
	cb || (cb = function () {});

	debug("Copy File");
	debug("src : " + src);
	debug("dest : " + dest);
	debug("Ignore list : " + ignorelist);

	if (isIgnored(src, ignorelist)) {
		debug("ignored : " + src);
		return cb(null);
	}
	fs.stat(src, function (err, stats) {
		if (err) {
			return cb(err);
		}

		if (!stats.isFile()) {
			return cb(new Error('srcpath is not a file: ' + src));
		}

		shell.exec('mkdir -p ' + path.dirname(dest), function (code, result) {
			if (code !== 0) { 
				return cb(result); 
			}

			var is = fs.createReadStream(src),
				os = fs.createWriteStream(dest);

			is.on('error', cb);
			os.on('error', cb);

			os.on('close', cb);

			is.pipe(os);
		});
	});
}

/**
 * Copies the contents of the specified dir into the dest dir, creating the
 * dest dir if necessary.
 * @param src
 * @param dest
 * @param ignorelist
 * @param cb
 */
function copydir(src, dest, ignorelist, cb) {
	cb || (cb = function () {});

	debug("Copy directory");
	debug("src : " + src);
	debug("dest : " + dest);
	debug("Ignore list : " + ignorelist);

	src  = path.resolve(src);
	dest = path.resolve(dest);
	if (isIgnored(src, ignorelist)) {
		debug("ignored : " + src);
		return cb();
	}
	
	function processDir(dir, next) {
		if (src === dir) {
			return next();
		}

		var rel = path.relative(src, dir);
		copydir(path.join(src, rel), path.join(dest, rel), ignorelist, next);
	}

	function processFile(file, next) {
		var rel = path.relative(src, file);
		copy(path.join(src, rel), path.join(dest, rel), ignorelist, next);
	}

	shell.exec('mkdir -p ' + dest, function (code, result) {
		if (code !== 0) {
			return cb(result);
		}
		
		if (path.basename(src) === "node_modules") {
			debug("node_modules copy : skip the ignore check for children");
			shell.cp('-rf', src, path.join(dest, '..'));
			return cb();
		}

		fs.stat(src, function (err, stats) {
			if (err) {
				return cb(err);
			}

			if (!stats.isDirectory()) {
				return cb(new Error('srcpath is not a directory: ' + src));
			}

			forEach(src, processDir, processFile, ignorelist, cb);
		});
	});
}



/**
 *
 * @param dir
 * @param dirIterator
 * @param fileIterator
 * @param cb
 */
function forEach(dir, onDir, onFile, ignorelist, cb) {
	cb || (cb = function () {});

	fs.readdir(dir, function (err, files) {
		debug("----> Files : " + files);
		// Ignore ENOENT
		if (err) { return err.code === 'ENOENT' ? cb() : cb(err); }

		var file;
		var remaining = files.length;
		var tasks = [];

		if (!remaining) {
			return onDir(dir, cb);
		}

		function onStat(file) {
			return function (err, stats) {
				var task;

				if (stats.isDirectory()) {

					if (path.basename(file) === "node_modules") {
						debug("node_modules copy : skip the ignore check for children");
						
						task = function (next) {
							// Process
							onDir(file, next);
						};

					} else if (!isIgnored(file, ignorelist)) {
						task = function (next) {
							// Descend
							forEach(file, onDir, onFile, ignorelist, next);
						};
					}
					
				} else if (stats.isFile()) {
					//if (!isIgnored(file, ignorelist)) {
                    task = function (next) {
                        // Process
                        onFile(file, next);
                    };
                    //}
					
				}

				task && tasks.push(task);
				remaining--;

				if (!remaining) {
					// All files have been evaluated, so start processing
					async.waterfall(tasks, function (err) {
						if (err) { return cb(err); }

						onDir(dir, cb);
					});
				}
			};
		}

		while (files.length) {
			file = path.join(dir, files.shift());

			fs.stat(file, onStat(file));
		}
	});
}