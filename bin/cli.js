#!/usr/bin/env node
'use strict';
var program = require('commander'),
	pkg = require('../package.json'),
	orch = require('../lib/orchestrator');

program
  .version(pkg.version);


program.command('build')
	.description('Builds the nodejs application')
	.action(function(options){
	orch.exec(['build']);
});

program.command('bake')
	.description('Executes the predefined grunt tasks/ npm scripts')
	.action(function(options){
	orch.exec(['bake']);	
});

program.command('bundle')
	.description('Bundles the application source code into desirable format (default is .tgz)')
	.action(function(options){
	orch.exec(['bundle']);
});

program.command('b2')
	.description('Execute build and bake')
	.action(function(options){
	orch.exec(['build', 'bake']);
});

program.command('b3')
	.description('Execute build, bake and bundle')
	.action(function(options){
	orch.exec(['build', 'bake', 'bundle']);
});

program.parse(process.argv);
