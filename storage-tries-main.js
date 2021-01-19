const utils = require('ethereumjs-util');
const fs = require("fs");
const readline = require('readline');
const blocks = require('./blocks-module');
const Statistics = require('./blocks-module').Statistics;
const async = require('async');

const ACCOUNTS_IN_PARALLEL=1000;

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
function readAccountsCSVFiles(path, stream, streamDepths, cb, onDone) {
    fs.readdir(path, (err, files) => {

        if (err) { console.error("Could not list the directory.", err); return; }

        let tasks = []
        files.forEach((file, index) => {
            if (file.startsWith("accounts_storage") && file.endsWith(".csv"))
                tasks.push((taskCB) => cb(path + file, stream, streamDepths, taskCB));
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
function analyseStorage(filePath, stream, streamDepths, onDone) {

    let stats = new Statistics();
    let cbTasks = [];
    let bn;
    let storageStream;

    console.time('Storage-file-' + filePath);
    readStorageData(filePath, (blockNumber, accountAddress, storageRoot, onDoneInner)=>{

        let trieRoot = utils.toBuffer(storageRoot);
        if (storageStream === undefined) storageStream = fs.createWriteStream(CSV_PATH_STORAGE + 'storage_' + blockNumber + '.csv');

        if (blockNumber) {
            bn = blockNumber; // remember block number

            // collect all tasks (TODO this may be memory consuming ~ for 8M it needs about 13GB RAM)
            cbTasks.push(function (onDoneTask) {
                let oneTriStat = new Statistics();
                // console.log(transactionTrieStr + "->" + trieRoot)
                blocks.iterateSecureTrie(trieRoot, (key, value, node, depth) => {

                    // global statistics per all tries
                    stats.addNode(key, node, value, depth);
                    stats.addValue(value, depth);

                    // stats for this single trie
                    oneTriStat.addNode(key, node, value, depth);
                    oneTriStat.addValue(value, depth);

                    if (value) stats.printProgress(1000000);
                    // leaf iterated - end
                    if (!node) {
                        // collect max depth and size of current trie in the global statistics
                        if (oneTriStat.maxValue >=0) {
                            stats.addTrieStat(oneTriStat);
                            addCsvStorageTrie(storageStream, blockNumber, oneTriStat.maxValue, oneTriStat.nodeSize, oneTriStat.totalNodes, oneTriStat.countValues, ()=>
                            onDoneTask(null));
                        } else onDoneTask(null)
                    }
                });
            });

        } else {
            // all lines read - execute
            console.log("all lines from csv_acc red, lines: " + cbTasks.length)
            async.parallelLimit(cbTasks, ACCOUNTS_IN_PARALLEL, ()=>storageStream.end(()=>onDoneInner(bn)));
        }

    }, (blockNum)=>{
        console.timeEnd('Storage-file-' + filePath);

        if (stats.countValues > 0) {
            // console.log(`Storage slots: ${accountAddress} -> ${total}`);
            const mean = stats.mean();
            const dev = stats.dev(mean);

            const tasks = []
            tasks.push(d => addCsvLine(stream, blockNum, stats.countValues,
                stats.totalNodes, mean, dev, stats.minValue, stats.maxValue, stats.valueSize, stats.nodeSize, d));
            tasks.push(d => addCsvDepths(streamDepths, blockNum, stats, d));
            async.parallel(tasks, onDone)
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

function addCsvDepths(stream, blockNumber, stats, onDone) {
    const trieDepths = stats.trieDepths
    const trieSizes = stats.trieSizes
    const trieNodes = stats.trieNodes;
    const trieValues = stats.trieValues;
    const keys = Object.keys(trieDepths);
    keys.sort((a, b) => a - b);

    const tasks = []
    keys.forEach(key => {
        const newLine = [];
        newLine.push(blockNumber);
        newLine.push(key);
        newLine.push(trieDepths[key]);
        newLine.push(trieSizes[key] / 1024 / 1024)  // MB
        newLine.push(trieNodes[key])
        newLine.push(trieValues[key])
        tasks.push(d => stream.write(newLine.join(',')+ '\n', d));
    })

    async.series(tasks, onDone);
}

function addCsvStorageTrie(stream, blockNumber, depth, size, nodes, values, onDone) {
    const newLine = [];


    newLine.push(blockNumber);
    newLine.push(depth);
    newLine.push(size / 1024 / 1024);
    newLine.push(nodes);
    newLine.push(values);

    stream.write(newLine.join(',')+ '\n', onDone);
}

/**
 * Wrap analysis into callbacks
 * @param blocksDir Dir with blocks_*.csv files
 * @param stream stream with CSV to dump results

 */
function processStorageAnalysis(blocksDir) {

    const stream = fs.createWriteStream(CSV_PATH_RES + 'blocks_storage.csv');
    const streamDepths = fs.createWriteStream(CSV_PATH_RES + 'blocks_storage_depths.csv');
    console.time('Storage-all');
    readAccountsCSVFiles(blocksDir, stream, streamDepths,  analyseStorage, ()=> {
        stream.end()
        streamDepths.end()
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
const CSV_PATH_STORAGE = "csv_storage/";

main = function() {
    processStorageAnalysis(CSV_PATH);
}

/** Init with DB path. */
blocks.init(dbPath, main);

