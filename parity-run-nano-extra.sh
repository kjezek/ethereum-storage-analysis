#!/bin/bash

#
# Run nano instrumentation for Parity.
# Import 0.1M Sample block into respective block dump
# Collect data in CSV files
# Run for Extra Storage experiment - it must import due to DB incompatibility
#

PARITY_PATH=/home/kjezek/parity-ethereum/target/release/parity
PARITY_PATH_EXE="$PARITY_PATH/target/release/parity"
LOGS_BACKUP_PATH=/mnt/backup/kamil
FULL_BLOCKS_PATH=/mnt/backup/kirk/blocks/
SAMPLE_BLOCKS_PATH=/home/kjezek/_etherum_data/blocks/
DB_PATH=/home/kjezek/_parity_data/

JAVA_ANALYSER_EXE="$PARITY_PATH/research-1911/parityloganalyser/target/parity-log-analyser-1.0-SNAPSHOT-spring-boot.jar"

BLOCKS_SAMPLES_ARRAY=("0.1M.blockchain" "1.1M.blockchain" "2.1M.blockchain" "3.1M.blockchain" "4.1M.blockchain" "5.1M.blockchain" "6.1M.blockchain" "7.1M.blockchain" "8.1M.blockchain" "9.1M.blockchain")
BLOCKS_FULL_ARRAY=( "0-1M.blockchain" "1-2M.blockchain" "2-3M.blockchain" "3-4M.blockchain" "4-5M.blockchain"  "5-6M.blockchain"  "6-7M.blockchain"  "7-8M.blockchain"  "8-9M.blockchain" "END")

rm *.csv
rm -rf $DB_PATH

for i in "${!BLOCKS_SAMPLES_ARRAY[@]}"; do

  CURRENT_BLOCKS_SAMPLES_PATH="$SAMPLE_BLOCKS_PATH/${BLOCKS_SAMPLES_ARRAY[$i]}"
  block="${!BLOCKS_SAMPLES_ARRAY[i]}"

  ## Run experiment
  echo "Running experiment for ${CURRENT_BLOCKS_SAMPLES_PATH}, DB: ${DB_PATH}"
  rm *.csv
  $PARITY_PATH_EXE import "$CURRENT_BLOCKS_SAMPLES_PATH" --base-path="$DB_PATH"  --no-warp

  java -jar $JAVA_ANALYSER_EXE .
  mv aggregated.csv.txt "aggregated.$block.txt"
  mkdir "$LOGS_BACKUP_PATH/logs_extra_storage.$block"
  mv *.csv "$LOGS_BACKUP_PATH/logs_extra_storage.$block/"
  echo "Result done for: aggregated.$block.txt"

  ## FUll import - we must import the data because the DB is incompatible with original parity DB
  CURRENT_BLOCKS_FULL_PATH="$FULL_BLOCKS_PATH/${BLOCKS_FULL_ARRAY[$i]}"
  echo "Full import for ${CURRENT_BLOCKS_FULL_PATH}, DB: ${DB_PATH}"
  $PARITY_PATH_EXE import "$CURRENT_BLOCKS_FULL_PATH" --base-path="$DB_PATH"

done
