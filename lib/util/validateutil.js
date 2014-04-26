'use strict';
var path = require('path'),
	fs = require('fs');

exports = module.exports = {
	skipNpmInstall : skipNpmInstall,
	skipBowerInstall : skipBowerInstall,
	skipGruntBuild : skipGruntBuild,
	skipGruntCLIInstall : skipGruntCLIInstall
};

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

function skipGruntBuild () {

	var gruntFilePath = process.env.GRUNT_FILE || path.join(process.cwd(), 'gruntfile.js');
	return ! (fs.existsSync(gruntFilePath));
}

function skipGruntCLIInstall () {

	var gruntFilePath = process.env.GRUNT_FILE || path.join(process.cwd(), 'gruntfile.js'),
		skipGruntBuild = !(fs.existsSync(gruntFilePath)),
		gruntCLIPath = path.join(process.cwd(), 'node_modules', '.bin', 'grunt');

	return (skipGruntBuild || fs.existsSync(gruntCLIPath));
}

