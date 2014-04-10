'use strict';
var path = require('path'),
    assert = require('chai').assert,
    fs = require('fs'),
    shell = require('shelljs'),
    fsutil = require('../lib/util/fsutil');

describe('Fsutil Test', function () {

    var pwd, rand = Math.floor((Math.random()*100)+1),
        source = path.join(process.cwd(), 'sourcetemp' + rand);
    this.timeout(100000);

    before(function () {
        pwd = process.cwd();
        //change the working dir to Fixtures
        process.chdir(path.join(__dirname, 'fixtures'));
        console.log('Changed working dir to -->', process.cwd());
        
    });

    after(function () {
        //Reset the pwd
        process.chdir(path.join(__dirname, 'fixtures'));
        shell.rm('-rf', source);

        process.chdir(pwd);
    });

    it('should copy the cwd files to sourcetemp', function (next) {

		var igList = [];
        igList.push(source);      
        fsutil.copydir(process.cwd(), source, igList, function (err){
            
            assert.notOk(err);
            //assert.strictEqual(true, fs.existsSync(path.join(process.cwd(), source, 'package.json')));
            next();
        })
		
    });

    
    

});