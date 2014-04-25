#!/bin/sh

cd "$( dirname $0 )/fixtures"
pwd
npm install ../../
echo "Executing the CLI"
node_modules/.bin/buildorch b3
RC=$?
if [ "$RC" != 0 ]; then
	echo "CLI failed"

fi
echo "Done with the CLI"


