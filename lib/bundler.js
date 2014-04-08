'use strict';
var async = require('async'),
	path = require('path'),
	fs = require('fs'),
	debug = require('debug')('bundler'),
	shell = require('shelljs');

function execBundle (bundleConfig, metrics, callback) {
	
	callback(null, bundleConfig);
}

module.exports = {
	bundle: execBundle
};