#!/usr/bin/env node
'use strict';
var program = require('commander'),
	pkg = require('../package.json'),
	orch = require('../lib/orchestrator'),
	spawn = require('child_process').spawn,
	fs = require('fs'),
	path = require('path'),
	shell = require('shelljs');

program
  .version(pkg.version);


program.command('build')
	.description('Builds the nodejs application')
	.action(function(options){
	var exitcode = orchestrate(['build']);
	process.exit(exitcode);
});

program.command('bake')
	.description('Executes the predefined grunt tasks/ npm scripts')
	.action(function(options){
	var exitcode = orchestrate(['bake']);
	process.exit(exitcode);	
});

program.command('bundle')
	.description('Bundles the application source code into desirable format (default is .tgz)')
	.action(function(options){
	var exitcode = orchestrate(['bundle']);
	process.exit(exitcode);
});

program.command('b2')
	.description('Execute build and bake')
	.action(function(options){
	var exitcode = orchestrate(['build', 'bake']);
	process.exit(exitcode);
});

program.command('b3')
	.description('Execute build, bake and bundle')
	.action(function(options){

	var exitcode = orchestrate(['build', 'bake', 'bundle']);
	process.exit(exitcode);

});
/**
 * 
 * @param tasks
 * @returns {Number}
 */
function orchestrate(tasks) {

	var random = Math.floor((Math.random() * 100000) + 1),
		outfile = path.join(shell.tempdir(), 'outfile' + random),
		start,
		now,
		timeout = process.env.BUILD_TIMEOUT || 1800000,
		executorPath = path.join(__dirname, 'executor.js'),
		options = {
			task : tasks,
			outfile : outfile
		}; 

	/**
	 * Write the exit code to outfile.
	 * @param exitcode
	 */
	function writeExitCode (exitcode) {
		var file_encoding = process.env.FILE_ENCODING || 'utf-8';
		fs.writeFileSync(outfile, exitcode, { encoding : file_encoding });
	}

	//Write a blank text to the outfile
	writeExitCode('');

	//Spawn the Child process
	var child = spawn(process.execPath, [ executorPath ], {
		stdio: ['ipc', process.stdout, process.stderr],
		detached: true
	});
	
	child.on('exit', function (code) {
		console.error('Buildorch exited with error ', code);
	});
	
	child.send(JSON.stringify(options));
	child.unref();

	/**
	 * Wait till the code is properly updated in the outfile
	 * TODO: Change this `while` check to use a timely check  
	 */
	start = new Date();
	now = new Date();
	var exitcode = parseInt('', 10);
	while (isNaN(exitcode) && now.getTime() < start.getTime() + timeout) {
		now = new Date();
		var file_encoding = process.env.FILE_ENCODING || 'utf-8';
		exitcode = parseInt(fs.readFileSync(outfile, file_encoding), 10);
	}

	//Clean up the outfile
	if (fs.existsSync(outfile)) {
		shell.rm('-f', outfile);
	}
	if (typeof exitcode === 'undefined') {
		exitcode = 1;
	}
	return exitcode;
}

program.parse(process.argv);
