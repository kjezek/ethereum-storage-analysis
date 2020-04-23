const utils = require('ethereumjs-util');
const fs = require("fs");
const readline = require('readline');
const blocks = require('./blocks-module');
const Statistics = require('./blocks-module').Statistics;
const Account = require('ethereumjs-account').default;
const Transaction = require('ethereumjs-tx').Transaction;
const async = require('async');

// running less blocks in parallel produces results sooner
// because a lot of parallel actions prolong single executions
const BLOCKS_IN_PARALLEL=100;

/**
 * Read data about blocks and trigger Trie analysis
 * @param file
 * @param cb callback
 * @param onLine invoked when file is processed
 */
function readBlocksData(file, cb, onLine) {
    const stream = fs.createReadStream(file);
    const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity
    });

    rl.on('line', line => {
        const items = line.split(",");
        const blockNumber = items[0];
        const blockHashStr = items[1];
        const stateRootStr = items[2];
        const transactionTrieStr = items[3];
        const receiptTrieStr = items[4];

        const fn = (taskCB) => cb(blockNumber, blockHashStr, stateRootStr, transactionTrieStr, receiptTrieStr, taskCB);
        onLine(fn);
    });

    rl.on('close', () => onLine(null));  // null signals end
}

/**
 * Read blocks from CSV files
 * @param path path
 * @param cb callback
 * @param onDone called when all CSV files are processed
 */
function readBlocksCSVFiles(path, cb, onDone) {
    fs.readdir(path, (err, files) => {

        if (err) { console.error("Could not list the directory.", err); return; }

        let tasks = [];
        files.forEach((file, index) => {
            if (file.startsWith("blocks") && file.endsWith(".csv"))  {
                // execute partly in sequence to prevent out-of-memory
                readBlocksData(path + file, cb, (task)=>{
                    // add a task to the queue or run execution after last task
                    if (task) tasks.push(task); else async.parallelLimit(tasks, BLOCKS_IN_PARALLEL, onDone);
                });
            }
        });
    });

}

/**
 * This callback analyses Account State Trie
 * @type {analyseAccountsCB}
 */
analyseAccountsCB = function(stream, streamStorage, blockNumber, blockHashStr, stateRootStr, transactionTrieStr, receiptTrieStr, onDone) {

    const fileName = 'csv_acc/accounts_storage_' + blockNumber + '.csv';
    let streamAcc;

    let stateRoot = utils.toBuffer(stateRootStr);
    let totalContractAccounts = 0;
    let totalContractValues = 0;
    let stats = new Statistics();

    // accumulate values globally per block
    let totalStorage = 0;
    let statsStorage = new Statistics();

    console.time('Blocks-Account-' + blockNumber);

    blocks.iterateSecureTrie(stateRoot, (key, value, node, depth) => {

        stats.addNode(key,  node, value);
        stats.addValue(value, depth);

        // we have value when the leaf has bean reached
        if (value) {
            let acc = new Account(value);

            if (acc.isContract()) {
                totalContractAccounts++;
                const accountNumber = utils.bufferToHex(key);
                const stateRootStr = utils.bufferToHex(acc.stateRoot);

                // This CSV file maps account addresses to state roots.
                if (!streamAcc) streamAcc = fs.createWriteStream(fileName);
                addCsvLineStorageRoot(streamAcc, blockNumber, accountNumber, stateRootStr);

                // accumulate data for all contracts data
                // we do this in a separate script to save time here
                // blocks.iterateSecureTrie(acc.stateRoot, (keyC, valueC, nodeC, depthC) => {
                //     statsStorage.addNode(keyC, nodeC);  // accumulate node info
                //     if (valueC) {
                //         totalStorage++;
                //         totalContractValues++;
                //         statsStorage.append(depthC);
                //     }
                // });
            }

            // check progress for every new account
            stats.printProgress(1000000);
        }

        // node is null for end of iteration
        if (!node) {
            if (stats.countValues > 0) {
                console.log(`Accounts: ${blockNumber} -> ${stats.countValues}, ${totalContractAccounts}, ${totalContractValues}`);
                console.timeEnd('Blocks-Account-' + blockNumber);

                // TODO - these callback are a bit crazy, but I do not have time at the moment to study something better such as premises
                let tasks = 1;
                const onDoneTasks = ()=>{if (--tasks === 0) onDone()};

                if (totalStorage > 0) {
                    tasks++;
                    // statistics for storage for all accounts
                    const meanC = stats.mean();
                    const devC = stats.dev(meanC);
                    addCsvLine(streamStorage, blockNumber, totalStorage,
                        statsStorage.totalNodes, meanC, devC,
                        statsStorage.minValue, statsStorage.maxValue, stats.valueSize, statsStorage.nodeSize, onDoneTasks);
                }

                // statistics for accounts
                const mean = stats.mean();
                const dev = stats.dev(mean);
                addCsvLineAccount(stream, blockNumber,
                    stats.countValues, totalContractAccounts,
                    stats.totalNodes, mean, dev,
                    stats.minValue, stats.maxValue, stats.valueSize, stats.nodeSize, onDoneTasks);


            } else {
                onDone();
            }

            if (streamAcc) streamAcc.end();
        }

        // console.log(`nonce: ${new BN(acc.nonce)}`);
        // console.log(`balance: ${new BN(acc.balance)}`);
        // console.log(`storageRoot: ${utils.bufferToHex(acc.stateRoot)}`);
        // console.log(`codeHash: ${utils.bufferToHex(acc.codeHash)}`);
    });
};

/**
 * This callback analyses Transaction Trie.
 * @type {analyseAccountsCB}
 */
analyseTransactionCB = function(stream, blockNumber, blockHashStr, stateRootStr, transactionTrieStr, receiptTrieStr, onDone) {

    let trieRoot = utils.toBuffer(transactionTrieStr);
    let stats = new Statistics();

    console.time('Blocks-Transactions-' + blockNumber);

    // console.log(transactionTrieStr + "->" + trieRoot)
    blocks.iterateTrie(trieRoot, (key, value, node, depth) => {

        stats.addNode(key,  node, value);
        stats.addValue(value, depth);

        if (value) {
            const trans = new Transaction(value);
            console.log("Tx:" + trans);
        }

        if (node) {
            if (stats.countValues > 0) {
                console.log(`Transactions: ${blockNumber} -> ${stats.countValues}`);
                console.timeEnd('Blocks-Transactions-' + blockNumber);
                const mean = stats.mean();
                const dev = stats.dev(mean);
                addCsvLine(stream, blockNumber, stats.countValues,
                    stats.totalNodes, mean, dev, stats.minValue, stats.maxValue, stats.valueSize, stats.nodeSize, onDone);
            } else {
                onDone();
            }
        }
    });
};

/**
 * This callback analyses Receipt Trie
 * @type {analyseAccountsCB}
 */
analyseReceiptCB = function(stream, blockNumber, blockHashStr, stateRootStr, transactionTrieStr, receiptTrieStr, onDone) {

    let trieRoot = utils.toBuffer(receiptTrieStr);
    let stats = new Statistics();

    console.time('Blocks-Receipts-' + blockNumber);

    // console.log(transactionTrieStr + "->" + trieRoot)
    blocks.iterateTrie(trieRoot, (key, value, node, depth) => {

        stats.addNode(key, node, value);
        stats.addValue(value, depth);

        if (value) {
            // const trans = new Transaction(value);
            console.log("Tx Rec:" + value);
        }

        if (node) {
            if (stats.countValues > 0) {
                console.log(`Transactions: ${blockNumber} -> ${stats.countValues}`);
                const mean = stats.mean();
                const dev = stats.dev(mean);
                addCsvLine(stream, blockNumber, stats.countValues,
                    stats.totalNodes, mean, dev, stats.minValue, stats.maxValue, stats.valueSize, stats.nodeSize, onDone);
            } else {
                onDone();
            }
        }
    });
};

/**
 * Dump one line in CSV
 * @param stream
 * @param blockNumber
 * @param counts
 * @param numNodes
 * @param avrgDepth
 * @param sizeNodes
 * @param devDepth
 */
function addCsvLine(stream, blockNumber, counts, numNodes, avrgDepth, devDepth, min, max, valueSize, sizeNodes, onDone) {
    const newLine = [];

    const sizeNodesMB = sizeNodes / 1024 / 1024;
    // numNodes = number of keys in the DB, the key size is 32 bytes
    const keySizesMB = numNodes*32 / 1024 / 1024;
    const valueSizeMB = valueSize / 1024 / 1024;

    newLine.push(blockNumber);
    newLine.push(counts);
    newLine.push(numNodes);
    newLine.push(avrgDepth);
    newLine.push(devDepth);
    newLine.push(min);
    newLine.push(max);
    newLine.push(valueSizeMB);
    newLine.push(sizeNodesMB);
    newLine.push(keySizesMB);
    newLine.push(keySizesMB + sizeNodesMB); // total size = size of 32 byte keys PLUS size of nodes

    stream.write(newLine.join(',')+ '\n', onDone);
}

function addCsvLineAccount(stream, blockNumber, allAccounts, contractAccounts, numNodes, avrgDepth, devDepth, min, max, valueSize, sizeNodes, onDone) {
    const newLine = [];

    const sizeNodesMB = sizeNodes / 1024 / 1024;
    // numNodes = number of keys in the DB, the key size is 32 bytes
    const keySizesMB = numNodes*32 / 1024 / 1024;
    const valueSizeMB = valueSize / 1024 / 1024;

    newLine.push(blockNumber);
    newLine.push(allAccounts);
    newLine.push(contractAccounts);
    newLine.push(numNodes);
    newLine.push(avrgDepth);
    newLine.push(devDepth);
    newLine.push(min);
    newLine.push(max);
    newLine.push(valueSizeMB);
    newLine.push(sizeNodesMB);
    newLine.push(keySizesMB);
    newLine.push(keySizesMB + sizeNodesMB); // total size = size of 32 byte keys PLUS size of nodes

    stream.write(newLine.join(',')+ '\n', onDone);
}

function addCsvLineStorageRoot(stream, blockNumber, accountNumber, storageRoot, onDone) {
    const newLine = [];
    newLine.push(blockNumber);
    newLine.push(accountNumber);
    newLine.push(storageRoot);
    stream.write(newLine.join(',')+ '\n', onDone);
}

/**
 * Wrap analysis into callbacks
 * @param blocksDir Dir with blocks_*.csv files
 * @param stream stream with CSV to dump results
 * @param cb callback
 */
function processAnalysis(blocksDir, stream, cb) {

    readBlocksCSVFiles(blocksDir, (blockNumber, blockHashStr, stateRootStr, transactionTrieStr, receiptTrieStr, onDone) => {
        cb(stream, blockNumber, blockHashStr, stateRootStr, transactionTrieStr, receiptTrieStr, onDone);
    }, () => {
        stream.end();
    });
}

function processAnalysisAccounts(blocksDir, path, cb) {

    const stream = fs.createWriteStream(path + 'accounts.csv')
    // this accumulates storage data per block
    const streamStorage = fs.createWriteStream(path + "blocks_storage.csv");

    console.time("Analyse-accounts");

    readBlocksCSVFiles(blocksDir, (blockNumber, blockHashStr, stateRootStr, transactionTrieStr, receiptTrieStr, onDone) => {
        cb(stream, streamStorage, blockNumber, blockHashStr, stateRootStr, transactionTrieStr, receiptTrieStr, onDone);
    }, () => {
        stream.end();
        streamStorage.end();
        console.timeEnd("Analyse-accounts");
    });
}

/**
 * Main program - read blocks from pre-generated CSV files and
 * generate statistics about the tries.
 */
const args = process.argv.slice(2);
const dbPath = args[0];
// const startBlock = parseInt(args[1]);
// const endBlock = parseInt(args[2]);
// const stepBlock = parseInt(args[3]);

const CSV_PATH = "csv_blocks/";
const CSV_PATH_RES = "csv_res/";

main = function () {
    processAnalysisAccounts(CSV_PATH, CSV_PATH_RES, analyseAccountsCB);
    processAnalysis(CSV_PATH, fs.createWriteStream(CSV_PATH_RES + 'transactions.csv'), analyseTransactionCB);
    processAnalysis(CSV_PATH, fs.createWriteStream(CSV_PATH_RES + 'receipts.csv'), analyseReceiptCB);
}

/** Init with DB path. */
blocks.init(dbPath, main);

