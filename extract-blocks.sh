#!/bin/bash

DB_PATH="/Users/kjezek/Library/Ethereum/geth/chaindata"
#DB_PATH="/Users/kjezek/Library/Application Support/io.parity.ethereum/chains/ethereum/db/906a34e69aec8c0d/overlayrecent/db"

START_BLOCK=0
MAX_BLOCK=9000000
STEP_BLOCK=1000000

node blocks-main.js $DB_PATH $START_BLOCK $MAX_BLOCK $STEP_BLOCK

