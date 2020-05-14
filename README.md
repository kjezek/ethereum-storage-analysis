# Introduction

This repository contains a couple of scripts to analyse Ethereum database. 
It is based on NodeJS and uses the Level module to access the LevelDB databse. 
It means the scripts are suitable to analyse the database generated by Ethereum Geth client. 

# Installation

The scirpts need NodeJS installed: https://nodejs.org/

# Run

The scripts allow for getting information about
* Blocks - block number, root hashes of Transation, Receipt and World State Tries
* Accounts - statistics about the World State Trie (see below)
* Smart Contract Storage - statistics about the Storate Trie (see below)

The scripts are executed via NodeJS, for example

```
> node block-one-latest-main.js /path/to/leveldb/geth/chaindata 
```

## Blocks

* block-one-latest-main.js  -- collect only one, the latest, block from the database
* block-latest-main.js  -- collect all blocks from the datbase, starting by the latest one

**Run:**
```
node block-one-latest-main.js /path/to/leveldb/geth/chaindata 
node block-latest-main.js /path/to/leveldb/geth/chaindata 
```
**Output:**
The scirpts generate CSV files in the directory  **csv_blocks/**  (make sure it exists), the format is

```
block number | block hash | state trie root hash | transaction trie root hash | receipt trie root hash
```

## Accounts

* tries-main.js - collect various statistics about State Trie

**Run:**
```
node tries-main.js /path/to/leveldb/geth/chaindata 
```
+ the directory **csv_blocks/** must contain the blocks to analyze (obtained by running the previous scripts).

**Output:**
The script generates CSV files  **csv_res/acconts.csv**, it contains statistics including the number of contracts, 
the number of nodes in the trie, depth, sizes in MB, the format is:
```
block number | #contract values | #nodes | avrg depth | dev depth | min depth | max depth | contract values (MB) | nodes incl. values (MB) | DB keys (MB) | total (MB) 
```
In parallel it outpus CSV files in the directory **csv_acc/** with details about the accounts. The format is
```
block number | account number | storage root hash 
```

## Smart Contract storage

* storage-tries-main.js -- collect statistics (similar to the account) for Smart Contract storage 

**Run:**
```
node storage-tries-main.js /path/to/leveldb/geth/chaindata 
```
+ the directory **csv_acc/** must contain accounts to analyze.

**Output:**
The script generates CSV files  **csv_res/block_storage.csv**, it contains statistics similar to accounts, the format is:
```
block number | #contract values | #nodes | avrg depth | dev depth | min depth | max depth | contract values (MB) | nodes incl. values (MB) | DB keys (MB) | total (MB)
```


# Note

This tool collects only the data from the LevelDB databse. Modern versions of Geth offlouad ancient data in a separate file blob. 
This data are not visible for this tool. 