#!/bin/bash
# Test Script
#
curl -k https://raw.github.com/subeeshcbabu/buildorch/master/buildorch.sh -o buildorch.sh
source buildorch.sh
installNode
#export SKIP_LINT=true
npm install ../../

node_modules/.bin/buildorch b2


