Buildorch
=========

# Overview
A Simple CLI based utility to Orchestrate NodeJs Application builds.
The workflow has these three,
- Build  (NPM Install)
- Beat   (Execute the Grunt tasks - lint,test,cover,build OR execute the npm scripts lint,test,cover,build)
- Bundle (Bundle the Application code and node_modules - Default format is tgz)

# Usage

Init script to install nodejs and npm and configure the npm defaults

    curl https://raw.github.com/subeeshcbabu/buildorch/master/buildorch.sh | sh

Install the module
	
	npm install buildorch

Commands
	
	node_modules/.bin/buildorch build
	node_modules/.bin/buildorch beat
	node_modules/.bin/buildorch bundle
	node_modules/.bin/buildorch b3


# Features:

## Configuration based 

```js

{
	"init" : {
		"clean"	: [
			"node_modules"
		],
		"script" : ""

	},

	"build" : {
		"files" : [

		],
		"script" : ""
	},

	"beat" : {
		"files" : [

		],
		"script" : ""
	},

	"bundle" : {
		"format" : "tgz",
 		"files" : [

		],
		"target" : "target",
		"script" : "",
		"clean"	: [
			"source"
		]
	}
}
```

## Generates build metrics



#Pre Requisite
Unix OS

