#!/bin/bash

DB_PATH="/Users/kjezek/Library/Ethereum/geth/chaindata"
#DB_PATH="/Users/kjezek/Library/Application Support/io.parity.ethereum/chains/ethereum/db/906a34e69aec8c0d/overlayrecent/db"

MAX_BLOCK=10000000
STEP_BLOCK=1000000
SAMPLE_BLOCK=$STEP_BLOCK

## Iterate from Zero to Max with a Step and run async  extraction of respective blocks from the DB
for ((i = 0 ; i <= MAX_BLOCK-STEP_BLOCK ; i = i+STEP_BLOCK)); do
#    echo "$DB_PATH $i $((i+STEP_BLOCK))";
    node blocks-main.js $DB_PATH "$i" $((i+SAMPLE_BLOCK))  &
done

wait