const utils = require('ethereumjs-util');
const fs = require("fs");
const readline = require('readline');
const blocks = require('./blocks-module');
const rlp = require('rlp');
const Account = require('ethereumjs-account').default;
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
    blocks.iterateAccounts(stateRoot, (key, value) => {
        const acc = new Account(value)
        console.log(`nonce: ${new BN(acc.nonce)}`)
        console.log(`balance: ${new BN(acc.balance)}`)
        console.log(`storageRoot: ${utils.bufferToHex(acc.stateRoot)}`)
        console.log(`codeHash: ${utils.bufferToHex(acc.codeHash)}`)
        // let rlpVal = rlp.decode(value);
        // console.log(`key: ${utils.bufferToHex(key)} -> Value: ${utils.bufferToHex(rlp.decode(value))}`)
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

readBlocksCSVFiles(CSV_PATH, analyseAccountsCB);