#!/usr/bin/env node
'use strict';

var orch = require('../lib/orchestrator');
/**
 *
 * @param task
 * @param outfile
 */
function exec(task, outfile) {

	orch.execSync(task, outfile);

}
/**
 *
 */
process.on('message', function (data) {

	var options = JSON.parse(data.toString());
	console.log("Opations", options);

	exec(options.task, options.outfile);
});