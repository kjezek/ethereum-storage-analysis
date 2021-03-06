#!/bin/bash

HEAP_SIZE=32986
GETH_EXE=/home/kjezek/go-ethereum/build/bin/geth
BLOCKS_PATH=/mnt/backup/kirk/blocks
DB_PATH=/home/kjezek/_geth_db
ANALYSER_PATH=/home/kjezek/ethereum-storage-analysis/

BLOCKS_ARRAY=("0-1M.blockchain" "1-2M.blockchain"  "2-3M.blockchain"  "3-4M.blockchain"  "4-5M.blockchain"  "5-6M.blockchain"  "6-7M.blockchain"  "7-8M.blockchain" "8-9M.blockchain"  "9-10M.blockchain" "10-11M.blockchain")

process_block_height () {
  local block=$1
  local LEVEL_DB_PATH="$DB_PATH/geth/chaindata"
  echo "Executed analysis for $LEVEL_DB_PATH"

  node --max-old-space-size=$HEAP_SIZE ../blocks-one-latest-main.js "$LEVEL_DB_PATH"
  node --max-old-space-size=$HEAP_SIZE ../tries-main.js "$LEVEL_DB_PATH"
  node --max-old-space-size=$HEAP_SIZE ../storage-tries-main.js "$LEVEL_DB_PATH"
}

#rm -rf $DB_PATH
for block in "${BLOCKS_ARRAY[@]}"; do

  # import block height
  echo "Import of $block"
  $GETH_EXE --datadir "$DB_PATH" import "$BLOCKS_PATH/$block"

  # analyse block height
  echo "Analysis of $block"
  cd $ANALYSER_PATH
  mkdir "$block"  "$block/csv_blocks" "$block/csv_acc" "$block/csv_res" "$block/csv_storage"
  cd "$block"; process_block_height "$block";
done
