const DB_PATH="/Users/kjezek/Library/Ethereum/geth/chaindata"
// const DB_PATH="/Users/kjezek/Library/Application Support/io.parity.ethereum/chains/ethereum/db/906a34e69aec8c0d/overlayrecent/db"


const utils = require('ethereumjs-util');
const async = require("async");
const blocks = require('./blocks-analysis');
const fs = require("fs")

// const level = require('level-rocksdb')

let writeStream = fs.createWriteStream('./csv/blocks.csv')
console.time('all-blocks');

// iterate blocks, dump in  CSV
blocks.init(DB_PATH);
blocks.iterateBlocks((err, block, blockHash) => {

    if (err != null || block == undefined) {
        writeStream.end();
        console.log(err || `BLOCK DONE`)
        console.timeEnd('all-blocks');

    } else {
        const blockNumber = utils.bufferToInt(block.header.number);
        const blockHashStr = block.hash().toString('hex');
        const stateRootStr = block.header.stateRoot.toString('hex');
        const transactionTrieStr = block.header.transactionsTrie.toString('hex');
        const receiptTrieStr = block.header.receiptTrie.toString('hex');

        //console.log(err || `BLOCK ${blockNumber}: ${blockHashStr}`)

        let newLine = []
        newLine.push(blockNumber)
        newLine.push(blockHashStr)
        newLine.push(stateRootStr)
        newLine.push(transactionTrieStr)
        newLine.push(receiptTrieStr)
        writeStream.write(newLine.join(',')+ '\n', () => {});
    }

});




