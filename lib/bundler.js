'use strict';
var async = require('async'),
	path = require('path'),
	fs = require('fs'),
	debug = require('debug')('bundler'),
	shell = require('shelljs'),
	archiver = require('archiver'),
	log4js = require('log4js'),
	logger = log4js.getLogger("Build"),
	fsutil = require('./util/fsutil');

function execBundle (bundleConfig, metrics, callback) {

	var config = bundleConfig.execbundle;

	var rand = Math.floor((Math.random()*1000)+1),
		source = path.join(process.cwd(), 'sourcetemp' + rand),
		igList = getIgnoreList(config);

	igList.unshift(source);

	fsutil.copydir(process.cwd(), source, igList, function(err){
		
		if(err) {
			return callback(err, bundleConfig);
		}
		
		if (!fs.existsSync(config.target)) {
			shell.mkdir('-p', config.target);
		}
		var outfile = path.join(config.target, metrics.application + "." + config.format),
			bundleOut = fs.createWriteStream(outfile),
			archive = archiver('tar');

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
			{ src : [ source + '/**'], data: { date: new Date() }},
	  		{ expand: true, cwd: source + '/**', src: ['**'] }
		]);

		archive.finalize();
	});
}

function getIgnoreList(config) {
	var ignoreFiles = config.ignorefile;
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
				ignoreList.concat((ignoreFile ? shell.cat(ignoreFile) : "").split("\n"));
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

module.exports = {
	bundle: execBundle
};