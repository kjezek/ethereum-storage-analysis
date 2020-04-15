#!/bin/bash

DB_PATH="/Users/kjezek/Library/Ethereum/geth/chaindata"
#DB_PATH="/Users/kjezek/Library/Application Support/io.parity.ethereum/chains/ethereum/db/906a34e69aec8c0d/overlayrecent/db"

#rm csv_blocks/*.csv

#START_BLOCK=0
#END_BLOCK=9000000
#BLOCK_HEIGHT=1000000
#BLOCK_SAMPLE=1
#node blocks-main.js $DB_PATH $START_BLOCK $END_BLOCK $BLOCK_HEIGHT $BLOCK_SAMPLE

node blocks-one-latest-main.js $DB_PATH
node tries-main.js $DB_PATH
node storage-tries-main.js $DB_PATH
