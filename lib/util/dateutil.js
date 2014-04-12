'use strict';

/**
 *
 * @param digit
 * @returns {*}
 */
function prefixZero(digit){
	var digitStr = digit + "";
	if (digitStr && digitStr.length < 2) {
		return ("0" + digitStr);
	}
	return digitStr;
}
/**
 * 
 * @param date
 * @returns {XML|string}
 */
function format(date) {
	var FORMAT = "yyyy-MM-dd hh:mm:ss",
		day = prefixZero(date.getDate()),
		month = prefixZero(date.getMonth() + 1),
		year = date.getFullYear(),
		hr  = prefixZero(date.getHours()),
		min = prefixZero(date.getMinutes()),
		sec = prefixZero(date.getSeconds());
  
	var result = FORMAT
		.replace(/dd/g, day)
		.replace(/MM/g, month)
		.replace(/yyyy/g, year)
		.replace(/hh/g, hr)
		.replace(/mm/g, min)
		.replace(/ss/g, sec);
	
	return result;
}

module.exports = {
	format: format
};