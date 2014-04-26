'use strict';
var nconf = require('nconf'),
	path = require('path'),
	fs = require('fs'),
	async = require('async'),
	shell = require('shelljs'),
	debug = require('debug')('b3config'),
	shortstop = require('shortstop'),
	handlers = require('shortstop-handlers'),
	jsonminify = require('jsonminify'),
	getit =require('getit');
/**
 *
 * @constructor
 */
function B3Config (){
	this._config = nconf;
	//Load the User defined JSON config first then the default config
	this._files = [ path.join(__dirname, '..', 'config', 'buildorch.json')];
	var override = path.join(process.cwd(), 'buildorch.json');
	if(fs.existsSync(override)) {
		this._files.unshift(override);
	}

	//Set the resolver
	this._resolver = shortstop.create();
	this._resolver.use('file', handlers.file(process.cwd()));
	this._resolver.use('path', handlers.path(process.cwd()));
	this._resolver.use('env', handlers.env());
	this._resolver.use('base64', handlers.base64());
	this._resolver.use('require', handlers.require(process.cwd()));
	this._resolver.use('exec', handlers.exec(process.cwd()));

	//Custom getit Handler
	this._resolver.use('getit', getitHandler(process.cwd()));
}
/**
 *
 * @type {{loadConfig: loadConfig}}
 */
B3Config.prototype = {

	/*
	* Load the Config files
	*/
	loadConfig : function loadConfig(cb) {
		var that = this;
		this._config.env().argv().use('memory');
		debug('loadConfig from files ' + this._files);
		/*
		* the iterator that resolves the dynamic values
		*/
		function resolveConfig (file, callback) {
			debug('resolve config data from file ' + file);
			fs.exists(file, function (exists){
				debug('File ' + file + ' exists : ' + exists);
				if (exists) {
					var jsonOut = JSON.parse(jsonminify(fs.readFileSync(file, 'utf8')));
					that._resolver.resolve(jsonOut, function (err, data) {
						if (err) {
							debug('resolver error ' + err);
							callback(err);
						} else {
							debug('resolved data: ' + JSON.stringify(data));
							that._config.use(file, {
								type: 'literal',
								store: data
							});
							callback();
						}
						
					});

				} else {
					callback(new Error("Config file " + file + " does not exists"));
				}
			});
		}

		async.eachSeries(this._files, resolveConfig, function (err){
			if (err) {
				cb (err, null);
			} else {
				cb (null, that._config);
			}
		});

		
	}
};
/**
 *
 * @param basedir
 * @returns {getFile}
 */
function getitHandler(basedir) {

	basedir = basedir || process.cwd();

	return function getFile (fileFormat, callback) {
		/**
		 * Follows the synax - "getit:<url>#[target_location]#[ENV to download],[nooverride]"
		 *
		 * <url> - The remote URL from where the content is downloaded
		 * [target_location] - optional. The local path (relative to cwd) to save the file
		 * 
		 * [ENV to download] -  optional. The ENV to decide whether download the file or not.
		 *						`process.env.[ENV to download]` should be true to download the file.
		 * [nooverride]	- optional. If added, the download will not happen if file exists.
		 */

		debug('getit format : ' + fileFormat);

		var details = fileFormat.split('#'),
			file = details[0],
			fileloc = details[1],
			skipDetails = details[2],
			download = true,
			nooverride = false,
			fileSave;

		fileloc = fileloc || path.basename(file); //Relative path
		fileSave = path.join(basedir, fileloc);		//Absolute path
		debug('getit file ' + file);
		debug('getit file location : ' + fileloc);

		if (skipDetails) {
			var envs = skipDetails.split(',');
			envs.forEach(function(value){
				if (value === 'nooverride') {
					nooverride = true;
				} else {
					download = falsy(process.env[value]);
				}

			});
		}
		/**
		 * If downlaod is not set to true then skip the getit.
		 */
		if (!download) {
			debug('download is set to false');
			return callback(null, undefined);
		}
		/**
		 * If nooverride is set to true and file already exist in local skip the getit.
		 */
		if (nooverride) {
			//Check if File exists
			debug('nooverride is set to true');
			if (fs.existsSync(fileSave)) {
				debug('File exists ' + fileSave + '. no need to download.');
				return callback(null, fileSave);
			}
		}

		getit(file, function(err, data) {
			if (err) {
				debug('getit resolver Handler error ' + err);
				callback(err, undefined);
			} else {
				// Get It Call Success
				
				//Create the directory if not exists
				if (!fs.existsSync(path.dirname(fileSave))) {
					shell.mkdir('-p', path.dirname(fileSave));
				}
				var file_encoding = process.env.FILE_ENCODING || 'utf-8';
				debug("File encoding : " + file_encoding);
				fs.writeFile(fileSave, data, { encoding: file_encoding, mode : '0777'}, function (err) {
					if (err) {
						debug('getit File save Error : ' + err);
						callback(err, null);
					} else {
						// File Saved
						debug('getit File saved to : ' + fileSave);
						callback(null, fileSave);
					}
				});
			}
		});
	};

}

function falsy (value) {
	return value !== '' && value !== 'false' && value !== '0' && value !== undefined;
}
/**
 *
 * @param callback
 */
function createConfig(callback){

	new B3Config().loadConfig(callback);
	
}

module.exports = {
	create: createConfig
};

