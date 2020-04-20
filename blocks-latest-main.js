const blocks = require('./blocks-module');
const fs = require("fs");

/** START Program.  */
const args = process.argv.slice(2);
const dbPath = args[0];

main = function () {
    const writeStream = fs.createWriteStream('./csv_blocks/blocks.csv');

    console.time("Blocks-latest")
    /** Iterate blocks from latest.  */
    let tasks = 0;
    let end = false;
    blocks.iterateBlocksLatest((err, block, blockHash) => {

        if (err || !block) {
            console.log(err || `BLOCK DONE`)
            console.timeEnd('Blocks-latest');
            end = true;
            if (tasks === 0) writeStream.end();  // close only if all lines are written
        } else {
            tasks++;
            blocks.addCsvLineBlock(writeStream, block, ()=>{
                if (--tasks === 0 && end) writeStream.end();  // close only if all lines are written and all tasks processed
            });
        }
    });


    console.log("All processing submitted, please wait results.");
}


/** Init with DB path. */
blocks.init(dbPath, main);



