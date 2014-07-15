#!/bin/sh


cd "$( dirname $0 )/fixtures"
pwd
rm -rf node_modules
npm install ../../
echo "Executing the CLI"
node_modules/.bin/buildorch b3
RC=$?
if [ "$RC" != 0 ]; then
	echo "CLI failed"
	exit 1
fi
echo "Done with the CLI"
exit 0


