const utils = require('ethereumjs-util');
const blocks = require('./blocks-module');
const fs = require("fs");

/** START Program.  */
const args = process.argv.slice(2);
const dbPath = args[0];

const CSV_PATH = "csv_blocks/";

main = function() {
    console.time("Blocks-latest")

// This gets only one block - the latest one
    blocks.getLatestBlock((err, block, blockHash) => {

        if (err) {
            console.log(err)
        } else {
            const blockNumber = utils.bufferToInt(block.header.number)
            const writeStream = fs.createWriteStream(CSV_PATH + 'blocks_' + blockNumber + '.csv');
            blocks.addCsvLineBlock(writeStream, block, () => {
                console.log(err || `BLOCK DONE`)
                console.timeEnd('Blocks-latest');
                writeStream.end();
            });
        }
    });
    console.log("All processing submitted, please wait results.");
}


/** Init with DB path. */
blocks.init(dbPath, main);


