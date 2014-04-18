'use strict';
var log4js = require('log4js'),
	path = require('path');
/**
 *
 * @returns {Logger}
 */
function getLogger() {
	log4js.replaceConsole();
	//log4js.loadAppender('file');
	//log4js.addAppender(log4js.appenders.file(path.join(process.cwd(), 'build.log')), 'BuildOrch');
	return log4js.getLogger("BuildOrch");
}

function startTask (logger, task) {

	logger.info("	");
	logger.info("###################################################################################");
	logger.info("#");
	logger.info("#				" + task);
	logger.info("#");
}

function endTask (logger, task) {
	logger.info("#");
	logger.info("#				" + task);
	logger.info("#");
	logger.info("###################################################################################");
	logger.info("	");
}


module.exports = {
	getLogger: getLogger,
	startTask: startTask,
	endTask: endTask
};
