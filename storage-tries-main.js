const utils = require('ethereumjs-util');
const fs = require("fs");
const readline = require('readline');
const blocks = require('./blocks-module');
const Statistics = require('./blocks-module').Statistics;
const async = require('async');

const ACCOUNTS_IN_PARALLEL=10000;

/**
 * Read data about blocks and trigger Trie analysis
 * @param file
 * @param cb callback
 * @param onDone invoked when file is processed
 */
function readStorageData(file, cb, onDone) {
    const stream = fs.createReadStream(file);
    const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity
    });

    rl.on('line', line => {
        const items = line.split(",");
        const blockNumber = items[0];
        const accountAddress = items[1];
        const storageRoot = items[2];

        cb(blockNumber, accountAddress, storageRoot, onDone);
    });

    rl.on('close', () => {
        cb(null, null, null, onDone);
    });
}

/**
 * Read Storage roots from the CSV files
 * @param path path
 * @param cb callback
 * @param onDone called when all CSV files are processed
 */
function readAccountsCSVFiles(path, stream, cb, onDone) {
    fs.readdir(path, (err, files) => {

        if (err) { console.error("Could not list the directory.", err); return; }

        let tasks = []
        files.forEach((file, index) => {
            if (file.startsWith("accounts_storage") && file.endsWith(".csv"))
                tasks.push((taskCB) => cb(path + file, stream, taskCB));
        });

        // execute all in sequence to prevent out-of-memory
        // every block has heaps of accounts to analyse
        async.series(tasks, onDone);
    });
}

/**
 * This callback analyses Storage Trie
 * @type {analyseAccountsCB}
 */
function analyseStorage(filePath, stream, onDone) {

    let stats = new Statistics();
    let tasks = 0;
    let allSubmitted = false

    console.time('Storage-file-' + filePath);
    readStorageData(filePath, (blockNumber, accountAddress, storageRoot, onDoneInner)=>{

        let trieRoot = utils.toBuffer(storageRoot);

        if (blockNumber) {
            tasks++;
            // console.log(transactionTrieStr + "->" + trieRoot)
            blocks.iterateSecureTrie(trieRoot, (key, value, node, depth) => {

                stats.addNode(key, node, value);
                stats.addValue(value, depth);

                if (!node) tasks--;     // leaf reached
                // all tries processed
                if (tasks === 0 && allSubmitted) {
                    onDoneInner(blockNumber);
                }
            });
        } else {
            allSubmitted = true;
        }

    }, (blockNum)=>{
        console.timeEnd('Storage-file-' + filePath);

        if (stats.countValues > 0) {
            // console.log(`Storage slots: ${accountAddress} -> ${total}`);
            const mean = stats.mean();
            const dev = stats.dev(mean);

            // TODO fix blockNum here - the value is undefined
            addCsvLine(stream, blockNum, stats.countValues,
                stats.totalNodes, mean, dev, stats.minValue, stats.maxValue, stats.valueSize, stats.nodeSize, onDone);
        } else {
            onDone();
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

/**
 * Wrap analysis into callbacks
 * @param blocksDir Dir with blocks_*.csv files
 * @param stream stream with CSV to dump results

 */
function processStorageAnalysis(blocksDir) {

    const stream = fs.createWriteStream(CSV_PATH_RES + 'blocks_storage.csv');
    console.time('Storage-all');
    readAccountsCSVFiles(blocksDir, stream,  analyseStorage, ()=> {
        stream.end()
        console.timeEnd('Storage-all');
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

const CSV_PATH = "csv_acc/";
const CSV_PATH_RES = "csv_res/";

main = function() {
    processStorageAnalysis(CSV_PATH);
}


/** Init with DB path. */
blocks.init(dbPath, main);


