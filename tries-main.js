const utils = require('ethereumjs-util');
const fs = require("fs");
const readline = require('readline');
const blocks = require('./blocks-module');
const Statistics = require('./blocks-module').Statistics;
const rlp = require('rlp');
const Account = require('ethereumjs-account').default;
const Transaction = require('ethereumjs-tx').Transaction;
const BN = utils.BN;


/**
 * Read data about blocks and trigger Trie analysis
 * @param file
 * @param cb callback
 * @param onDone invoked when file is processed
 */
function readBlocksData(file, cb, onDone) {
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
        const blockHashStr = items[1];
        const stateRootStr = items[2];
        const transactionTrieStr = items[3];
        const receiptTrieStr = items[4];

        lines++;

        cb(blockNumber, blockHashStr, stateRootStr, transactionTrieStr, receiptTrieStr, ()=> {
            if (--lines === 0 && end)
                onDone();   // invoke done when all lines are processed and the file is already closed.
        });
    });

    rl.on('close', () => {
        end = true;
    });
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

        // count how much files we have first
        let num = 0;
        files.forEach((file, index) => {
            if (file.startsWith("blocks") && file.endsWith(".csv"))  num++;
        });

        files.forEach((file, index) => {
            // read only CSV files with blocks
            if (file.startsWith("blocks") && file.endsWith(".csv")) {
                readBlocksData(path + file, cb, () => {
                    // on files done, call on done feedback
                    if ((--num) === 0) onDone();
                });
            }
        });
    });

}

/**
 * This callback analyses Account State Trie
 * @type {analyseAccountsCB}
 */
analyseAccountsCB = function(stream, streamAcc, blockNumber, blockHashStr, stateRootStr, transactionTrieStr, receiptTrieStr, onDone) {

    let stateRoot = utils.toBuffer(stateRootStr);
    let totalAccounts = 0;
    let totalContractAccounts = 0;
    let totalContractValues = 0;

    let stats = new Statistics();

    console.time('Blocks-Account-' + blockNumber);  

    blocks.iterateSecureTrie(stateRoot, (key, value, node, depth) => {

        stats.addNode(key,  node);

        // we have value when the leaf has bean reached
        if (value) {
            let acc = new Account(value);
            totalAccounts++;
            stats.append(depth);

            if (acc.isContract()) {
                totalContractAccounts++;
                const accountNumber = utils.bufferToHex(key);
                const stateRootStr = utils.bufferToHex(acc.stateRoot);
                addCsvLineStorageRoot(streamAcc, blockNumber, accountNumber, stateRootStr);
                // blocks.iterateSecureTrie(acc.stateRoot, (keyC, valueC, nodeC) => {
                //     if (keyC && valueC) {
                //         totalContractValues++;
                //     }
                // });
            }
        }

        // node is null for end of iteration
        if (!node) {
            if (totalAccounts > 0) {
                console.log(`Accounts: ${blockNumber} -> ${totalAccounts}, ${totalContractAccounts}, ${totalContractValues}`);
                console.timeEnd('Blocks-Account-' + blockNumber);
                const mean = stats.mean();
                const dev = stats.dev(mean);
                addCsvLineAccount(stream, blockNumber,
                    totalAccounts, totalContractAccounts,
                    stats.totalNodes, mean, dev, stats.minValue, stats.maxValue, stats.nodeSize);
            }
            onDone();
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
    let total = 0;
    let stats = new Statistics();

    console.time('Blocks-Transactions-' + blockNumber);

    // console.log(transactionTrieStr + "->" + trieRoot)
    blocks.iterateTrie(trieRoot, (key, value, node, depth) => {

        stats.addNode(key,  node);

        if (value) {
            const trans = new Transaction(value);
            console.log("Tx:" + trans);
            total++;
            stats.append(depth);
        }

        if (node) {
            if (total > 0) {
                console.log(`Transactions: ${blockNumber} -> ${total}`);
                console.timeEnd('Blocks-Transactions-' + blockNumber);
                const mean = stats.mean();
                const dev = stats.dev(mean);
                addCsvLine(stream, blockNumber, total,
                    stats.totalNodes, mean, dev, stats.minValue, stats.maxValue, stats.nodeSize);
            }
            onDone();
        }
    });
};

/**
 * This callback analyses Receipt Trie
 * @type {analyseAccountsCB}
 */
analyseReceiptCB = function(stream, blockNumber, blockHashStr, stateRootStr, transactionTrieStr, receiptTrieStr, onDone) {

    let trieRoot = utils.toBuffer(receiptTrieStr);
    let total = 0;
    let stats = new Statistics();

    console.time('Blocks-Receipts-' + blockNumber);

    // console.log(transactionTrieStr + "->" + trieRoot)
    blocks.iterateTrie(trieRoot, (key, value, node, depth) => {

        stats.addNode(key,  node);

        if (value) {
            // const trans = new Transaction(value);
            console.log("Tx Rec:" + value);
            total++;
            stats.append(depth);
        }

        if (node) {
            if (total > 0) {
                console.log(`Transactions: ${blockNumber} -> ${total}`);
                const mean = stats.mean();
                const dev = stats.dev(mean);
                addCsvLine(stream, blockNumber, total,
                    stats.totalNodes, mean, dev, stats.minValue, stats.maxValue, stats.nodeSize);
            }
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
function addCsvLine(stream, blockNumber, counts, numNodes, avrgDepth, devDepth, min, max, sizeNodes) {
    const newLine = [];

    const sizeNodesMB = sizeNodes / 1024 / 1024;
    // numNodes = number of keys in the DB, the key size is 32 bytes
    const keySizesMB = numNodes*30 / 1024 / 1024;

    newLine.push(blockNumber);
    newLine.push(counts);
    newLine.push(numNodes);
    newLine.push(avrgDepth);
    newLine.push(devDepth);
    newLine.push(min);
    newLine.push(max);
    newLine.push(sizeNodesMB);
    newLine.push(keySizesMB);
    newLine.push(keySizesMB + sizeNodesMB); // total size = size of 32 byte keys PLUS size of nodes

    stream.write(newLine.join(',')+ '\n', () => {});
}

function addCsvLineAccount(stream, blockNumber, allAccounts, contractAccounts, numNodes, avrgDepth, devDepth, min, max, sizeNodes) {
    const newLine = [];

    const sizeNodesMB = sizeNodes / 1024 / 1024;
    // numNodes = number of keys in the DB, the key size is 32 bytes
    const keySizesMB = numNodes*30 / 1024 / 1024;

    newLine.push(blockNumber);
    newLine.push(allAccounts);
    newLine.push(contractAccounts);
    newLine.push(numNodes);
    newLine.push(avrgDepth);
    newLine.push(devDepth);
    newLine.push(min);
    newLine.push(max);
    newLine.push(sizeNodesMB);
    newLine.push(keySizesMB);
    newLine.push(keySizesMB + sizeNodesMB); // total size = size of 32 byte keys PLUS size of nodes

    stream.write(newLine.join(',')+ '\n', () => {});
}

function addCsvLineStorageRoot(stream, blockNumber, accountNumber, storageRoot) {
    const newLine = [];
    newLine.push(blockNumber);
    newLine.push(accountNumber);
    newLine.push(storageRoot);
    stream.write(newLine.join(',')+ '\n', () => {});
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

function processAnalysisAccounts(blocksDir, stream, cb) {

    readBlocksCSVFiles(blocksDir, (blockNumber, blockHashStr, stateRootStr, transactionTrieStr, receiptTrieStr, onDone) => {
        const fileName = 'csv_acc/accounts_storage_' + blockNumber + '.csv';
        const streamAcc = fs.createWriteStream(fileName);
        cb(stream, streamAcc, blockNumber, blockHashStr, stateRootStr, transactionTrieStr, receiptTrieStr, ()=>{
            onDone();
            streamAcc.end();
            fs.stat(fileName, (err, stats) => {
                const size = stats["size"];
                if (size === 0) fs.unlinkSync(fileName);
            })
        });
    }, () => {
        stream.end();
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

const CSV_PATH = "csv_blocks/";
const CSV_PATH_RES = "csv_res/";

processAnalysisAccounts(CSV_PATH, fs.createWriteStream(CSV_PATH_RES + 'accounts.csv'), analyseAccountsCB);
processAnalysis(CSV_PATH, fs.createWriteStream(CSV_PATH_RES + 'transactions.csv'), analyseTransactionCB);
processAnalysis(CSV_PATH, fs.createWriteStream(CSV_PATH_RES + 'receipts.csv'), analyseReceiptCB);

