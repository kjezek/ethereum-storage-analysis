#!/bin/bash

#
# Run nano instrumentation for Parity.
# Import 0.1M Sample block into respective block dump
# Collect data in CSV files
#

PARITY_PATH=/home/kjezek/parity-ethereum/
PARITY_PATH_EXE="$PARITY_PATH/target/release/parity"
LOGS_BACKUP_PATH=/mnt/backup/kamil
DB_PATH=/home/kjezek/_etherum_data/

JAVA_ANALYSER_EXE="$PARITY_PATH/research-1911/parityloganalyser/target/parity-log-analyser-1.0-SNAPSHOT-spring-boot.jar"

BLOCKS_SAMPLES_ARRAY=("0.1M.blockchain" "1.1M.blockchain" "2.1M.blockchain" "3.1M.blockchain" "4.1M.blockchain" "5.1M.blockchain" "6.1M.blockchain" "7.1M.blockchain" "8.1M.blockchain" "9.1M.blockchain")
DB_BLOCK_HEIGHTS_DUMPS=( "io.parity.0" "io.parity.1" "io.parity.2" "io.parity.3" "io.parity.4" "io.parity.5" "io.parity.6" "io.parity.7" "io.parity.8" "io.parity.9")

for i in "${!BLOCKS_SAMPLES_ARRAY[@]}"; do

  # Maybe we need to copy DB dumps from the backup hdd as SSD will run out of space

  CURRENT_DB_PATH="$DB_PATH/${!DB_BLOCK_HEIGHTS_DUMPS[i]}"
  CURRENT_BLOCK_PATH="$DB_PATH/blocks/${!BLOCKS_SAMPLES_ARRAY[i]}"
  block="${!BLOCKS_SAMPLES_ARRAY[i]}"

  rm *.csv
  $PARITY_PATH_EXE import "$CURRENT_BLOCK_PATH" --base-path="$CURRENT_DB_PATH"  --no-warp

  java -jar $JAVA_ANALYSER_EXE .
  mv aggregated.csv.txt "aggregated.$block.txt"
  mkdir "$LOGS_BACKUP_PATH/logs.$block"
  mv *.csv "$LOGS_BACKUP_PATH/logs.$block/"

done
