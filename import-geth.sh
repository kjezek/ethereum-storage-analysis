#!/bin/bash

GETH_EXE=/home/kjezek/go-ethereum/build/bin/geth
BLOCKS_PATH=/mnt/backup/kirk/blocks
DB_BLOCKS_PATH=/mnt/backup/kamil/geth_data
DB_PATH=/home/kjezek/_geth_db

BLOCKS_ARRAY=("0-1M.blockchain" "1-2M.blockchain"  "2-3M.blockchain"  "3-4M.blockchain"  "4-5M.blockchain"  "5-6M.blockchain"  "6-7M.blockchain"  "7-8M.blockchain" "8-9M.blockchain")

#rm -rf $DB_PATH
for block in "${BLOCKS_ARRAY[@]}"; do
  echo "Import of $block"
  $GETH_EXE --datadir "$DB_PATH" import "$BLOCKS_PATH/$block"
  cp -r $DB_PATH "$DB_BLOCKS_PATH/$block"
done
