const DB_PATH="/Users/kjezek/Library/Ethereum/geth/chaindata"
// const DB_PATH="/Users/kjezek/Library/Application Support/io.parity.ethereum/chains/ethereum/db/906a34e69aec8c0d/overlayrecent/db"


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
    const stateRootStr = block.header.stateRoot.toString('hex');
    const transactionTrieStr = block.header.transactionsTrie.toString('hex');
    const receiptTrieStr = block.header.receiptTrie.toString('hex');

    //console.log(err || `BLOCK ${blockNumber}: ${blockHashStr}`)

    let newLine = [];
    newLine.push(blockNumber);
    newLine.push(blockHashStr);
    newLine.push(stateRootStr);
    newLine.push(transactionTrieStr);
    newLine.push(receiptTrieStr);
    writeStream.write(newLine.join(',')+ '\n', () => {});
}



blocks.init(DB_PATH);

let writeStream = fs.createWriteStream('./csv/blocks.csv')
console.time('all-blocks');

// iterate blocks, dump in  CSV
blocks.iterateBlocks2(0, 10000, (err, block, blockHash) => {

    if (err || !block) {
        writeStream.end();
        console.log(err || `BLOCK DONE`)
        console.timeEnd('all-blocks');
    } else {
        addCsvLineBlock(writeStream, block);
    }

});




