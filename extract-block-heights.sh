#!/bin/bash

HEAP_SIZE=8192
DB_BLOCKS_PATH=/mnt/backup/kamil/geth_data

BLOCKS_ARRAY=("0-1M.blockchain" "1-2M.blockchain"  "2-3M.blockchain"  "3-4M.blockchain"  "4-5M.blockchain"  "5-6M.blockchain"  "6-7M.blockchain"  "7-8M.blockchain")

process_block_height () {
  local block=$1
  local DB_PATH="$DB_BLOCKS_PATH/$block/geth/chaindata"
  echo "Executed analysis for $DB_PATH"

  node --max-old-space-size=$HEAP_SIZE ../blocks-one-latest-main.js "$DB_PATH"
  node --max-old-space-size=$HEAP_SIZE ../tries-main.js "$DB_PATH"
  node --max-old-space-size=$HEAP_SIZE ../storage-tries-main.js "$DB_PATH"
}

for block in "${BLOCKS_ARRAY[@]}"; do

  mkdir "$block"  "$block/csv_blocks" "$block/csv_acc" "$block/csv_res"
  (cd "$block" || return; process_block_height "$block" &> "$block".log; echo "$block done" ) &

done
