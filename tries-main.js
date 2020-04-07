const utils = require('ethereumjs-util');
const fs = require("fs");
const readline = require('readline');
const blocks = require('./blocks-module');
const rlp = require('rlp');
const Account = require('ethereumjs-account').default;
const Transaction = require('ethereumjs-tx').Transaction;
const BN = utils.BN;

class Statistics {
    constructor() {
        this.array = []
    }

    append(value) { this.array.push(value); }

    mean() { return this.array.reduce((a, b) => a + b) / n;}

    dev(mean) {
        const n = this.array.length;
        return Math.sqrt(this.array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
    }
}

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

    rl.on('line', line => {
        const items = line.split(",");
        const blockNumber = items[0];
        const blockHashStr = items[1];
        const stateRootStr = items[2];
        const transactionTrieStr = items[3];
        const receiptTrieStr = items[4];

        cb(blockNumber, blockHashStr, stateRootStr, transactionTrieStr, receiptTrieStr);
    });

    rl.on('close', () => {
        onDone();
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
                    // on done, call on done feedback
                    if ((--num) == 0) onDone();
                });
            }
        });
    });

}

/**
 * This callback analyses Account State Trie
 * @type {analyseAccountsCB}
 */
analyseAccountsCB = function(stream, blockNumber, blockHashStr, stateRootStr, transactionTrieStr, receiptTrieStr) {

    let stateRoot = utils.toBuffer(stateRootStr);
    let totalAccounts = 0;
    let totalContractAccounts = 0;
    let totalContractValues = 0;
    let totalNodes = 0;
    let nodesSize = 0;

    let accountsStats = new Statistics();

    console.time('Blocks-Account-' + blockNumber);  

    blocks.iterateSecureTrie(stateRoot, (key, value, node, depth) => {

        // key is non-null always except end of the stream
        if (key) {
            totalNodes++;  // increment total number of nodes
            let size = node.serialize().length;
            nodesSize += size;
        }

        // we have value when the leaf has bean reached
        if (value) {
            let acc = new Account(value);
            totalAccounts++;
            accountsStats.append(depth);

            if (acc.isContract()) {
                totalContractAccounts++;
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
                const mean = accountsStats.mean();
                const dev = accountsStats.dev(mean);
                addCsvLine(stream, blockNumber, totalAccounts, totalContractAccounts, totalNodes, mean, dev, nodesSize);
            }
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
analyseTransactionCB = function(stream, blockNumber, blockHashStr, stateRootStr, transactionTrieStr, receiptTrieStr) {

    let trieRoot = utils.toBuffer(transactionTrieStr);
    let totalTransactions = 0;

    console.time('Blocks-Transactions-' + blockNumber);

    // console.log(transactionTrieStr + "->" + trieRoot)
    blocks.iterateTrie(trieRoot, (key, value) => {
        if (key && value) {
            const trans = new Transaction(value);
            console.log("Tx:" + trans);
            totalTransactions++;
        } else {
            if (totalTransactions > 0) {
                console.log(`Transactions: ${blockNumber} -> ${totalTransactions}`);
                console.timeEnd('Blocks-Transactions-' + blockNumber);
            }
        }
    });
};

/**
 * This callback analyses Receipt Trie
 * @type {analyseAccountsCB}
 */
analyseReceiptCB = function(stream, blockNumber, blockHashStr, stateRootStr, transactionTrieStr, receiptTrieStr) {

    let trieRoot = utils.toBuffer(receiptTrieStr);
    let totalReceipts = 0;

    console.time('Blocks-Receipts-' + blockNumber);

    // console.log(transactionTrieStr + "->" + trieRoot)
    blocks.iterateTrie(trieRoot, (key, value) => {
        if (key && value) {
            // const trans = new Transaction(value);
            console.log("Tx:" + value);
            totalReceipts++;
        } else {
            if (totalReceipts > 0) {
                console.log(`Transactions: ${blockNumber} -> ${totalReceipts}`);
                console.timeEnd('Blocks-Receipts-' + blockNumber);
            }
        }
    });
};

/**
 * Dump one line in CSV
 * @param stream
 * @param blockNumber
 * @param values
 * @param keyPaths
 * @param keyPathsDeviation
 * @param sizeNodes
 * @param sizeNodesDeviation
 */
function addCsvLine(stream, blockNumber, values, keyPaths, keyPathsDeviation, sizeNodes, sizeNodesDeviation) {
    const newLine = [];
    newLine.push(blockNumber);
    newLine.push(values);
    newLine.push(keyPaths);
    newLine.push(keyPathsDeviation);
    newLine.push(sizeNodes);
    newLine.push(sizeNodesDeviation);
    stream.write(newLine.join(',')+ '\n', () => {});
}

function addCsvLine(stream, blockNumber, allAccounts, contractAccounts, numNodes, avrgDepth, devDepth, sizeNodes) {
    const newLine = [];
    newLine.push(blockNumber);
    newLine.push(allAccounts);
    newLine.push(contractAccounts);
    newLine.push(numNodes);
    newLine.push(avrgDepth);
    newLine.push(sizeNodes);
    stream.write(newLine.join(',')+ '\n', () => {});
}

/**
 * Wrap analysis into callbacks
 * @param blocksDir Dir with blocks_*.csv files
 * @param stream stream with CSV to dump results
 * @param cb callback
 */
function processAnalysis(blocksDir, stream, cb) {

    readBlocksCSVFiles(blocksDir, (blockNumber, blockHashStr, stateRootStr, transactionTrieStr, receiptTrieStr) => {
        cb(stream, blockNumber, blockHashStr, stateRootStr, transactionTrieStr, receiptTrieStr);
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

processAnalysis(CSV_PATH,
    fs.createWriteStream(CSV_PATH_RES + 'accounts.csv'),
    fs.createWriteStream('csv_acc/accounts.csv'),
    analyseAccountsCB);

// processAnalysis(CSV_PATH, fs.createWriteStream(CSV_PATH_RES + 'transactions.csv'), analyseTransactionCB);
// processAnalysis(CSV_PATH, fs.createWriteStream(CSV_PATH_RES + 'receipts.csv'), analyseReceiptCB);

