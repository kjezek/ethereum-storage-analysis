
const utils = require('ethereumjs-util');
const blocks = require('./blocks-module');
const fs = require("fs");

/** START Program.  */
const args = process.argv.slice(2);
const dbPath = args[0];


/** Init with DB path. */
blocks.init(dbPath);

const writeStream = fs.createWriteStream('./csv_blocks/blocks.csv');

console.time("Blocks-latest")
/** Iterate blocks from latest.  */
blocks.iterateBlocksLatest((err, block, blockHash) => {

    if (err || !block) {
        console.log(err || `BLOCK DONE`)
        console.timeEnd('Blocks-latest');
        writeStream.end();
    } else {
        blocks.addCsvLineBlock(writeStream, block);
    }
});

console.log("All processing submitted, please wait results.");





