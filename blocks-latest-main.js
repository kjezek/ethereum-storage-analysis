
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
// let tasks = 0;
// let end = false;
// blocks.iterateBlocksLatest((err, block, blockHash) => {
//
//     if (err || !block) {
//         console.log(err || `BLOCK DONE`)
//         console.timeEnd('Blocks-latest');
//         end = true;
//         if (tasks === 0) writeStream.end();  // close only if all lines are written
//     } else {
//         tasks++;
//         blocks.addCsvLineBlock(writeStream, block, ()=>{
//             if (--tasks === 0 && end) writeStream.end();  // close only if all lines are written and all tasks processed
//         });
//     }
// });


// This gets only one block - the latest one
blocks.getLatestBlock((err, block, blockHash) => {

    if (err) {
        console.log(err)
        writeStream.end();
    } else {
        blocks.addCsvLineBlock(writeStream, block, ()=>{
            console.log(err || `BLOCK DONE`)
            console.timeEnd('Blocks-latest');
            writeStream.end();
        });
    }
});

console.log("All processing submitted, please wait results.");





