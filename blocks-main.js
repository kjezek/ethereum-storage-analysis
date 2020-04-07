
const utils = require('ethereumjs-util');
const blocks = require('./blocks-module');
const fs = require("fs");



/** Process one batch of blocks. */
function processBlockBatch(writeStream, startBlock, endBlock, onDone) {

    const strRange = startBlock + '-' + endBlock;
    // const writeStream = fs.createWriteStream('./csv_blocks/blocks_' + strRange + '.csv') //  new CSV file for every block
    console.time('Blocks-' + strRange);

// iterate blocks, dump in  CSV
    blocks.iterateBlocks2(startBlock, endBlock, (err, block, blockHash) => {

        if (err || !block) {
            // writeStream.end();
            console.log(err || `BLOCK DONE`)
            console.timeEnd('Blocks-' + strRange);
            onDone();
        } else {
            blocks.addCsvLineBlock(writeStream, block);
        }
    });
}


/** START Program.  */
const args = process.argv.slice(2);
const dbPath = args[0];
const startBlock = parseInt(args[1]);
const endBlock = parseInt(args[2]);
const heightBlock = parseInt(args[3]);
const sampleBlocks = parseInt(args[4]);


/** Init with DB path. */
blocks.init(dbPath);

const writeStream = fs.createWriteStream('./csv_blocks/blocks.csv');
let allSubmitted = false;
let submittedHeights = 0;

/** Iterate from first to next block, with given step. */
for (let from = startBlock; from <= endBlock-heightBlock; from = from+heightBlock) {

    let to = (from+sampleBlocks);
    let strRange = from + '-' + to;
    console.log('Submitting: ' + strRange);

    submittedHeights++;

    processBlockBatch(writeStream, from, to, ()=> {
        if ((--submittedHeights === 0) && allSubmitted) {
            writeStream.end();
            console.log("All submitted work done. Blocks analysed. ");
        }
    });
}

allSubmitted = true;

console.log("All processing submitted, please wait results.");





