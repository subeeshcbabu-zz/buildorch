'use strict';
var grunt = require('grunt');

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
  	pkg: grunt.file.readJSON('package.json'),
  	jshint: {
  		files: ['index.js'],
  		options: {
  			jshintrc: '.jshintrc'
  		}
  	}
  });

  // Load the plugin that provides the "jshint" task.
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // Default task(s).
  grunt.registerTask('lint', ['jshint']);
  grunt.registerTask('test', ['jshin']);
  grunt.registerTask('coverage', ['jshint']);

  grunt.registerTask('default', ['test']);

};