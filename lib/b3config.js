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

	return function getFile (file, callback) {
		var details = file.split('#'), fileloc;
        file = details[0];
        fileloc = details[1];

		debug('getit file ' + file);
		fileloc = fileloc || path.basename(file); 
		debug('getit file location : ' + fileloc);

		getit(file, function(err, data) {
			if (err) {
				debug('getit resolver Handler error ' + err);
				callback(err, null);
			} else {
				// Get It Call Success
				var fileSave = path.join(basedir, fileloc);
				
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
						//shell.chmod('+x', fileSave);
						callback(null, fileSave);
					}
				});
			}
		});
	};

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

