const utils = require('ethereumjs-util');
const fs = require("fs");
const readline = require('readline');
const blocks = require('./blocks-module');
const rlp = require('rlp');
const Account = require('ethereumjs-account').default;
const Transaction = require('ethereumjs-tx').Transaction;
const BN = utils.BN;

/**
 * Read data about blocks and trigger Trie analysis
 * @param file
 */
function readBlocksData(file, cb) {
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
}

/**
 * Read blocks from CSV files
 * @param path path
 * @param cb callback
 */
function readBlocksCSVFiles(path, cb) {
    fs.readdir(path, (err, files) => {

        if (err) { console.error("Could not list the directory.", err); return; }

        files.forEach((file, index) => {
            // read only CSV files with blocks
            if (file.startsWith("blocks_") && file.endsWith(".csv")) {
                console.log("Opening CSV file: " + file);
                readBlocksData(path + file, cb);
            }
        });
    });
}

/**
 * This callback analyses Account State Trie
 * @type {analyseAccountsCB}
 */
analyseAccountsCB = ((blockNumber, blockHashStr, stateRootStr, transactionTrieStr, receiptTrieStr) => {

    const stateRoot = utils.toBuffer(stateRootStr);
    let totalAccounts = 0;
    let totalContractAccounts = 0;

    console.time('Blocks-Account-' + blockNumber);  

    blocks.iterateAccounts(stateRoot, (key, value) => {

        if (key && value) {
            const acc = new Account(value);
            totalAccounts++;
            if (acc.isContract()) totalContractAccounts++
        } else {
            if (totalAccounts > 0) {
                console.log(`Accounts: ${blockNumber} -> ${totalAccounts}, ${totalContractAccounts}`);
                console.timeEnd('Blocks-Account-' + blockNumber);
            }
        }

        // console.log(`nonce: ${new BN(acc.nonce)}`);
        // console.log(`balance: ${new BN(acc.balance)}`);
        // console.log(`storageRoot: ${utils.bufferToHex(acc.stateRoot)}`);
        // console.log(`codeHash: ${utils.bufferToHex(acc.codeHash)}`);
    });
});

/**
 * This callback analyses Account State Trie
 * @type {analyseAccountsCB}
 */
analyseTransactionCB = ((blockNumber, blockHashStr, stateRootStr, transactionTrieStr, receiptTrieStr) => {

    const trieRoot = utils.toBuffer(transactionTrieStr);
    let totalTransactions = 0;

    console.time('Blocks-Transactions-' + blockNumber);

    // console.log(transactionTrieStr + "->" + trieRoot)
    blocks.iterateTransactionsTrie(trieRoot, (key, value) => {
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
});

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

const CSV_PATH = "csv/";

// readBlocksCSVFiles(CSV_PATH, analyseAccountsCB);
readBlocksCSVFiles(CSV_PATH, analyseTransactionCB);
