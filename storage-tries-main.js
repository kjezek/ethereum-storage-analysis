const utils = require('ethereumjs-util');
const fs = require("fs");
const readline = require('readline');
const blocks = require('./blocks-module');
const Statistics = require('./blocks-module').Statistics;


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

    let lines = 0;
    let end = false;
    rl.on('line', line => {
        const items = line.split(",");
        const blockNumber = items[0];
        const accountAddress = items[1];
        const storageRoot = items[2];

        lines++;

        cb(blockNumber, accountAddress, storageRoot, ()=> {
            if (--lines === 0 && end)
                onDone();   // invoke done when all lines are processed and the file is already closed.
        });

    });

    rl.on('close', () => {
        end = true;
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

        // count how much files we have first
        let num = 0;
        files.forEach((file, index) => {
            if (file.startsWith("accounts_storage") && file.endsWith(".csv"))  num++;
        });

        files.forEach((file, index) => {
            // one file contains accounts for one block
            if (file.startsWith("accounts_storage") && file.endsWith(".csv")) cb(path + file, stream, ()=>{
                if (--num === 0) onDone();
            });
        });
    });

}

/**
 * This callback analyses Transaction Trie.
 * @type {analyseAccountsCB}
 */
analyseStorage = function(filePath, stream, onDone) {

    let total = 0;
    let stats = new Statistics();
    let blockNum;

    let tasks = 0;

    readStorageData(filePath, (blockNumber, accountAddress, storageRoot, onDoneInner)=>{

        let trieRoot = utils.toBuffer(storageRoot);
        blockNum = blockNumber;

        tasks++;
        // console.log(transactionTrieStr + "->" + trieRoot)
        blocks.iterateSecureTrie(trieRoot, (key, value, node, depth) => {

            stats.addNode(key, node, value);

            if (value) {
                total++;
                stats.append(depth);
            }

            // all tries processed
            if (!node && --tasks === 0) {
                onDoneInner();
            }
        });

    }, ()=>{
        if (total > 0) {
            // console.log(`Storage slots: ${accountAddress} -> ${total}`);
            const mean = stats.mean();
            const dev = stats.dev(mean);

            addCsvLine(stream, blockNum, total,
                stats.totalNodes, mean, dev, stats.minValue, stats.maxValue, stats.valueSize, stats.nodeSize, onDone);
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
    let numFiles = 0;
    readAccountsCSVFiles(blocksDir, stream, (path, stream, onDone)=>{
        numFiles++;
        console.time('Storage-file-' + path);
        analyseStorage(path, stream, ()=>{
            if (--numFiles === 0) {
                console.timeEnd('Storage-file-' + path);
                onDone();
            }
        })
    }, ()=> {
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

/** Init with DB path. */
blocks.init(dbPath);

const CSV_PATH = "csv_acc/";
const CSV_PATH_RES = "csv_res/";

processStorageAnalysis(CSV_PATH);

