Buildorch
=========

# Overview
A Simple CLI based utility to Orchestrate NodeJs Application builds.
The workflow has these three,
- Build  (NPM Install)
- Bake   (Execute the Grunt tasks - lint,test,cover,build OR execute the npm scripts lint,test,cover,build)
- Bundle (Bundle the Application code and node_modules - Default format is tgz)

## Usage

Init script to install nodejs and npm and configure the npm defaults

    curl https://raw.github.com/subeeshcbabu/buildorch/master/buildorch.sh | sh

Install the module
	
	npm install buildorch

Commands
	
	node_modules/.bin/buildorch b3  (Executes build, bake and bundle)
	node_modules/.bin/buildorch b2  (Executes build and bake)
	node_modules/.bin/buildorch build
	node_modules/.bin/buildorch bake
	node_modules/.bin/buildorch bundle
	
### Pre Requisite
Unix OS

## Features:

### Configuration based 

The build orchestartion works based on a JSON Configuration `buildorch.json`. If application did not specify a config json file, a default template is loaded. [buildorch.json](https://raw.github.com/subeeshcbabu/buildorch/master/config/buildorch.json). The config loader supports arbitrary types using the module [shortstop] (https://github.com/krakenjs/shortstop).

A Sample `buildorch.json`
```js

{
	"init" : {
		"clean"	: [
			"path:node_modules"
		],
		"script" : ""
	},

	"build" : {
		"files" : [
			"getit:https://raw.githubusercontent.com/subeeshcbabu/buildorch/master/buildorch.sh"
		],
		"script" : "path:buildscript.sh",
		"execbuild" : {
			"command" : "npm install"
		},
		"clean"	: [
			
		]
	},

	"bake" : {
		"files" : [

		],
		"script" : "path:bakescript.sh",
		"execbake" : {
			"lint" : "lint",
			"unittest" : "test",
			"coverage" : "coverage",
			"custom" : "build"
		},
		"clean"	: [
			
		]
	},

	"bundle" : {	
 		"files" : [

		],	
		"script" : "path:bundlescript.sh",
		"execbundle" : {
			"target" : "target",
			"format" : "tar"
		},
		"clean"	: [
			
		]
	},
	"metrics" : {
		"write" : {
			"outfile" : "path:build-metrics.json"
		}
	}
}
```
#### Handlers
##### [shortstop-handlers] (https://github.com/krakenjs/shortstop-handlers) - path, file, and env

##### getit handler
format - `getit:<remote file location>#<filepath>`
This handler will download the file and save it to the `process.cwd()/<filepath>` location.
The scripts and other executers can reference the file using `process.cwd()/<filepath>` path.
Eg:- `getit:https://raw.githubusercontent.com/subeeshcbabu/buildorch/master/buildorch.sh#build/build_init.sh`


### Tasks

##### clean

Clean the list of files/directories. This task can be added as a sub task for any Main tasks (init, build, bake, bundle etc)
```javascript
	"clean"	: [
		"path:node_modules"
	]
```
##### script

Execute any script by specifying the relative, absolute or remote file location. 
```javascript
	
	"script" : " path:nodefile.js"

	"script" : "getit:https://raw.githubusercontent.com/subeeshcbabu/buildorch/master/buildorch.sh#build/build_init.sh"

```

##### files

Download config/script files from remote location
```javascript
	"files"	: [
		"getit:https://raw.githubusercontent.com/subeeshcbabu/buildorch/master/buildorch.sh#build/build_init.sh"
	]
```
##### init

Gets executed automatically before command execs (b3, b2, build etc). You can add any one of the sub tasks for this (clean,files, script)

```javascript
		"init" : {
			"clean"	: [
				"path:node_modules"
			],
			"script" : ""
			"files"	: [
				"getit:https://raw.githubusercontent.com/subeeshcbabu/buildorch/master/buildorch.sh#build/build_init.sh"
			]
		}
```
##### build
##### bake
##### bundle
##### metrics

### Generates build metrics

The orachestartor generates a `build-metrics.json` file, helpful in figuring out the time spent on granular level tasks and status of individual steps.

A sample `build-metrics.json`

```js
{
  "application" : "foo",
  "userid" : "bar",
  "machine" : "blah",
  "environment" "development",
  "starttime": "2014-04-07T22:24:56.923Z",

  "init": {
    "starttime": "2014-04-07T21:17:25.882Z",
    "endtime": "2014-04-07T21:17:25.989Z"
  },

  "build": {
    "starttime": "2014-04-07T21:17:25.989Z",
    "endtime": "2014-04-07T21:17:28.622Z"
  },

  "bake": {
    "starttime": "2014-04-07T21:17:28.622Z",

    "lint": {
      "starttime": "2014-04-07T21:17:28.627Z",
      "endtime": "2014-04-07T21:17:28.866Z",
      "status": "SUCCESS"
    },

    "unittest": {
      "starttime": "2014-04-07T21:17:28.866Z",
      "endtime": "2014-04-07T21:17:29.248Z",
      "status": "FAILURE"
    },

    "coverage": {
      "starttime": "2014-04-07T21:17:29.248Z",
      "endtime": "2014-04-07T21:17:29.487Z",
      "status": "SUCCESS"
    },

    "custom": {
      "starttime": "2014-04-07T21:17:29.487Z",
      "endtime": "2014-04-07T21:17:29.725Z",
      "status": "SUCCESS"
    },

    "endtime": "2014-04-07T21:17:29.726Z"
  },

  "endtime": "2014-04-07T22:21:16.262Z",
  "status": "SUCCESS"
}
```


