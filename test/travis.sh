#!/usr/bin/env bash

if [ -z $NODE ]; then
  export NODE=6
fi

echo Installing nvm...
git clone https://github.com/creationix/nvm.git /tmp/.nvm
source /tmp/.nvm/nvm.sh
echo Installed nvm version `nvm --version`
nvm install $NODE
nvm use $NODE
nvm alias default $NODE
echo node version: `node --version`
echo npm version: `npm --version`
npm install
echo Install completed

if [[ $TEST_SUITE == 'integration' ]]; then
  wget https://bitcoin.org/bin/bitcoin-core-0.12.0/bitcoin-0.12.0-linux64.tar.gz
  tar -xf bitcoin-0.12.0-linux64.tar.gz
  PATH=./bitcoin-0.12.0/bin:$PATH
  npm run test-integration
elif [ $BROWSER ]; then
  npm run test-browser
else
  npm test
fi
