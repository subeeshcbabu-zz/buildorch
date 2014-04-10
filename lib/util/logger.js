'use strict';
var log4js = require('log4js');
/**
 *
 * @returns {Logger}
 */
function getLogger() {
	log4js.replaceConsole();
	log4js.loadAppender('file');
	log4js.addAppender(log4js.appenders.file('build.log'), 'BuildOrch');
	return log4js.getLogger("BuildOrch");
}

module.exports = {
	getLogger: getLogger
};
