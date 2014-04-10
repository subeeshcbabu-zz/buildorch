'use strict';
var path = require('path'),
    assert = require('chai').assert,
    fs = require('fs'),
    orchestrator = require('../lib/orchestrator');

describe('Orchestrator test', function () {

    var pwd, rand = Math.floor((Math.random()*100)+1);
    this.timeout(100000);

    before(function () {
        pwd = process.cwd();
        process.env.DEBUG = "orchestrator,b3config";
        //change the working dir to Fixtures
        process.chdir(path.join(__dirname, 'fixtures'));
        console.log('Changed working dir to -->', process.cwd());
        
    });

    after(function () {
        //Reset the pwd
       
        process.chdir(pwd);
    });

    it('should execute the build', function (next) {

		 orchestrator.exec(['build'], function(err){
            next();
        });

		
    });

    it('should execute the bake', function (next) {

        orchestrator.exec(['bake'], function(err){
            next();
        });

        
    });
    
    it('should execute the bundle', function (next) {

        orchestrator.exec(['bundle'], function(err){
            next();
        });

        
    });

    it('should execute the b2', function (next) {

        orchestrator.exec(['build', 'bake'], function(err){
            next();
        });

        
    });
    
    it('should execute the b3', function (next) {

        orchestrator.exec(['build', 'bake', 'bundle'], function(err){
            next();
        });

        
    });

});