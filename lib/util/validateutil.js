'use strict';
var path = require('path'),
	fs = require('fs');

exports = module.exports = {
	skipNpmInstall : skipNpmInstall,
	skipBowerInstall : skipBowerInstall,
	skipBowerCLIInstall : skipBowerCLIInstall,
	skipGruntBuild : skipGruntBuild,
	skipGruntCLIInstall : skipGruntCLIInstall
};

function skipNpmInstall () {

	var packageJsonPath = process.env.PACKAGE_FILE || path.join(process.cwd(), 'package.json');
	return ! fs.existsSync(packageJsonPath);
}

function skipBowerCLIInstall () {

	var bowerJsonPath = process.env.BOWER_FILE || path.join(process.cwd(), 'bower.json'),
		bowerInstallPath = path.join(process.cwd(), 'node_modules', 'bower', 'bin', 'bower');
	return (!fs.existsSync(bowerJsonPath)) || (fs.existsSync(bowerInstallPath));
}

function skipBowerInstall () {

	var bowerJsonPath = process.env.BOWER_FILE || path.join(process.cwd(), 'bower.json');
	return (!fs.existsSync(bowerJsonPath));
}

function skipGruntBuild () {

	var filePath = process.env.GRUNT_FILE && path.join(process.cwd(), process.env.GRUNT_FILE),
		gruntFilePath1 = filePath || path.join(process.cwd(), 'gruntfile.js'),
		gruntFilePath2 = filePath || path.join(process.cwd(), 'Gruntfile.js');
	return ! (fs.existsSync(gruntFilePath1) || fs.existsSync(gruntFilePath2));
}

function skipGruntCLIInstall () {

	var filePath = process.env.GRUNT_FILE && path.join(process.cwd(), process.env.GRUNT_FILE),
		gruntFilePath1 = filePath || path.join(process.cwd(), 'gruntfile.js'),
		gruntFilePath2 = filePath || path.join(process.cwd(), 'Gruntfile.js'),
		skipGruntBuild = !(fs.existsSync(gruntFilePath1) || fs.existsSync(gruntFilePath2)),
		gruntCLIPath = path.join(process.cwd(), 'node_modules', '.bin', 'grunt');

	return (skipGruntBuild || fs.existsSync(gruntCLIPath));
}

