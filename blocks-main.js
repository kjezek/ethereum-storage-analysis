
const utils = require('ethereumjs-util');
const async = require("async");
const blocks = require('./blocks-module');
const fs = require("fs")


/**
 * Add a line into a CSV file with blocks
 * @param writeStream
 * @param block
 */
function addCsvLineBlock(writeStream, block) {
    const blockNumber = utils.bufferToInt(block.header.number);
    const blockHashStr = block.hash().toString('hex');
    const stateRootStr = block.header.stateRoot.toString();
    const transactionTrieStr = block.header.transactionsTrie.toString();
    const receiptTrieStr = block.header.receiptTrie.toString();

    //console.log(err || `BLOCK ${blockNumber}: ${blockHashStr}`)

    let newLine = [];
    newLine.push(blockNumber);
    newLine.push(blockHashStr);
    newLine.push(stateRootStr);
    newLine.push(transactionTrieStr);
    newLine.push(receiptTrieStr);
    writeStream.write(newLine.join(',')+ '\n', () => {});
}


/** START Program.  */
const args = process.argv.slice(2);
const dbPath = args[0];
const startBlock = parseInt(args[1]);
const endBlock = parseInt(args[2]);

const strRange = startBlock + '-' + endBlock;

blocks.init(dbPath);

let writeStream = fs.createWriteStream('./csv/blocks_' + strRange + '.csv')
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




