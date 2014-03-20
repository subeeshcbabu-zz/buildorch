#!/bin/sh
# The Init Script for Node and NPM Install and Init
#
#
echo "************************ Start Init *************************"
node_default_ver=v0.10.25
# Initialize the Bash profile
echo "Initialize the bash profile"
bash_profile=$HOME/.bash_profile
if [ -f "$bash_profile" ]; then
  echo ".bash_profile exists"
else
  touch $bash_profile
fi
if [ -f "$HOME/.profile" ]; then
  echo ".profile exists"
else
  touch $HOME/.profile
fi
if [ ! -f ".bashrc" ]; then
  touch .bashrc
fi

source $bash_profile

node_ver=$node_default_ver
if [ ! -z "$NODE_VERSION" ]; then
	node_ver=$NODE_VERSION 
fi
# Get the required nodejs version using NVM
current_node_ver=`nvm ls $node_ver`
check_ver=`echo "$current_node_ver" | grep "$node_ver"`
echo "Installed node version: $current_node_ver"
if [ ! -z "$check_ver" ]; then
	echo "$node_ver is alreday available"

else
	echo "node version to install: $node_ver"
	# Install Node using NVM - https://github.com/creationix/nvm
	curl https://raw.github.com/creationix/nvm/master/install.sh | /bin/sh
	source $bash_profile
	nvm install $node_ver
fi

nvm use $node_ver
node_dir=$HOME/.nvm/$node_ver
node_exec_path=$node_dir/bin
if [ -f "$node_exec_path/node" ]; then
	echo "Successfully Installed node and npm"
	echo "node exec path - `which node`"
	echo "node version `node -v`"
	echo "npm exec path `which npm`"
	echo "npm version `npm -v`"
else
	echo "Failed to install the node version $node_ver using NVM"
	#TODO what to do if the NVM Install fails? Exit the CI Build?
	exit 1
fi

##
## Set the NPM Configurations
##
if [ ! -z "$NPM_REGISTRY" ]; then
	echo "Set the npm config registry to $NPM_REGISTRY"
	npm config set registry $NPM_REGISTRY
fi

if [ ! -z "$NPM_CACHE" ]; then
	echo "Set the npm config cache to $NPM_CACHE"
	npm config set cache $NPM_CACHE
fi

if [ ! -z "$NPM_TMP" ]; then
	echo "Set the npm config tmp to $NPM_TMP"
	npm config set tmp $NPM_TMP
fi


if [ ! -z "$PYTHON_PATH" ]; then
	echo "Set the npm config python to $PYTHON_PATH"
	npm config set python $PYTHON_PATH
fi

echo "************************ End Init *************************"
exit 0
