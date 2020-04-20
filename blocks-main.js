
const utils = require('ethereumjs-util');
const blocks = require('./blocks-module');
const fs = require("fs");



/** Process one batch of blocks. */
function processBlockBatch(writeStream, startBlock, endBlock, onDone) {

    const strRange = startBlock + '-' + endBlock;
    // const writeStream = fs.createWriteStream('./csv_blocks/blocks_' + strRange + '.csv') //  new CSV file for every block
    console.time('Blocks-' + strRange);

// iterate blocks, dump in  CSV
    let tasks = 0;
    let end = false;
    blocks.iterateBlocks2(startBlock, endBlock, (err, block, blockHash) => {

        if (err || !block) {
            // writeStream.end();
            console.log(err || `BLOCK DONE`)
            console.timeEnd('Blocks-' + strRange);
            end = true;
            if (tasks === 0) onDone();  // call done if all CSV writes are done
        } else {
            tasks++;
            blocks.addCsvLineBlock(writeStream, block, ()=>{
                if (--tasks === 0 && end) onDone();  // call done if all processed and all CSV lines written
            });
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

main = function () {

    const writeStream = fs.createWriteStream('./csv_blocks/blocks.csv');
    let allSubmitted = false;
    let submittedHeights = 0;

    console.time("Export-Blocks-all");

    /** Iterate from first to next block, with given step. */
    for (let from = startBlock; from <= endBlock - heightBlock; from = from + heightBlock) {

        let to = (from + sampleBlocks);
        let strRange = from + '-' + to;
        console.log('Submitting: ' + strRange);

        submittedHeights++;
        processBlockBatch(writeStream, from, to, () => {
            if ((--submittedHeights === 0) && allSubmitted) {
                writeStream.end();
                console.timeEnd("Export-Blocks-all");
            }
        });
    }

    allSubmitted = true;
    console.log("All processing submitted, please wait results.");
}


/** Init with DB path. */
blocks.init(dbPath, main);




