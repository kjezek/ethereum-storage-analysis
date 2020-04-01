
const utils = require('ethereumjs-util');
const blocks = require('./blocks-module');
const fs = require("fs");


/**
 * Add a line into a CSV file with blocks
 * @param writeStream
 * @param block
 */
function addCsvLineBlock(writeStream, block) {
    const blockNumber = utils.bufferToInt(block.header.number);
    const blockHashStr = block.hash().toString('hex');
    const stateRootStr = block.header.stateRoot.toString('hex');
    const transactionTrieStr = block.header.transactionsTrie.toString('hex');
    const receiptTrieStr = block.header.receiptTrie.toString('hex');

    //console.log(err || `BLOCK ${blockNumber}: ${blockHashStr}`)

    const newLine = [];
    newLine.push(blockNumber);
    newLine.push(blockHashStr);
    newLine.push(stateRootStr);
    newLine.push(transactionTrieStr);
    newLine.push(receiptTrieStr);
    writeStream.write(newLine.join(',')+ '\n', () => {});
}

/** Process one batch of blocks. */
function processBlockBatch(startBlock, endBlock) {

    const strRange = startBlock + '-' + endBlock;
    const writeStream = fs.createWriteStream('./csv/blocks_' + strRange + '.csv')
    console.time('Blocks-' + strRange);

// iterate blocks, dump in  CSV
    blocks.iterateBlocks2(startBlock, endBlock, (err, block, blockHash) => {

        if (err || !block) {
            writeStream.end();
            console.log(err || `BLOCK DONE`)
            console.timeEnd('Blocks-' + strRange);
        } else {
            addCsvLineBlock(writeStream, block);
        }
    });
}


/** START Program.  */
const args = process.argv.slice(2);
const dbPath = args[0];
const startBlock = parseInt(args[1]);
const endBlock = parseInt(args[2]);
const stepBlock = parseInt(args[3]);


/** Init with DB path. */
blocks.init(dbPath);

/** Iterate from first to next block, with given step. */
for (let from = startBlock; from <= endBlock-stepBlock; from = from+stepBlock) {

    let to = (from+stepBlock);
    let strRange = from + '-' + to;
    console.log('Submitting: ' + strRange);
    processBlockBatch(from, to);
}

console.log("All processing submitted, please wait results. ");





