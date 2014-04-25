'use strict';
var path = require('path'),
	fs = require('fs');

function skipNpmInstall () {

	var packageJsonPath = process.env.PACKAGE_FILE || path.join(process.cwd(), 'package.json');
	return ! fs.existsSync(packageJsonPath);
}


function skipBowerInstall () {

	var bowerJsonPath = process.env.BOWER_FILE || path.join(process.cwd(), 'bower.json'),
		bowerInstallPath = path.join(process.cwd(), 'node_modules', 'bower', 'bin', 'bower');
	return ! (fs.existsSync(bowerJsonPath) && 
		fs.existsSync(bowerInstallPath));
}

module.exports = {
	skipNpmInstall : skipNpmInstall,
	skipBowerInstall : skipBowerInstall
};