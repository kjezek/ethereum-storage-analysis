const Blockchain = require('ethereumjs-blockchain').default;
const utils = require('ethereumjs-util');
const async = require("async");
const level = require('level');

// Open the RocksDB
exports.init = function(DB_PATH) {
    const dbOptions = {  };
    const db = level(DB_PATH, dbOptions)

    const blockchainOpts = { db: db, hardfork:  "byzantium", validate : false }
    blockchain =  new Blockchain(blockchainOpts);
}


/**
 * Read the last block from the DB
 * @param cb
 */
getLatestBlocks = function(cb) {
    blockchain.getLatestBlock((err, block) => {
        const blockNumber = utils.bufferToInt(block.header.number);
        const blockHash = block.hash().toString('hex');
        console.log(err || `LATEST BLOCK ${blockNumber}: ${blockHash}`)
        cb(err, block);
    });
};

/**
 * Iterate all blocks. It starts from the latest one and goes to parents via parent hash
 */
exports.iterateBlocks = function (cb1) {

    let blockHash; // current block hash, changed every loop

    /** Start iteration by finding the latest block. */
    getLatestBlocks((err, block) => {

        if (err) return cb1(err);

        blockHash = block.hash();
        // iterate all blocks until there is no previous block
        // WHIST is a loop - it contains condition, next, and error callback
        async.whilst(cb => cb(null, blockHash),  // check condition
            run,        // run next, callback must receive error and result obj.
            err => {
                return (cb1(err));
            }  // end condition
        );
    });

    function run(cb2) {
        let block;

        async.series([getBlock], function (err) {
            cb1(err, block, blockHash);

            if (!err) {
                blockHash = block.header.parentHash;
            } else {
                blockHash = false;
                // No more blocks, return
                if (err.type === 'NotFoundError') {
                    return cb1(err, block ,blockHash);
                }
            }
            cb2(err, block, blockHash)
        });

        function getBlock(cb3) {
            blockchain.getBlock(blockHash, (err, b) => {
                block = b;
                cb3(err);
            });
        }
    }
};


/**
 * Iterate blocks between Start and End number.
 */
exports.iterateBlocks2 = function (start, end, cb1) {

    let blockNumber = start;

    // iterate all blocks until there is no previous block
    // WHIST is a loop - it contains condition, next, and error callback
    async.whilst(cb => cb(null, blockNumber < end),  // check condition
        run,        // run next, callback must receive error and result obj.
        err => {
            return (cb1(err));
        }  // end condition
    );

    function run(cb2) {
        let block;

        async.series([getBlock], function (err) {

            blockNumber += 1;

            if (block) cb1(err, block, block.hash());  // callback only if we have data
            if (err && err.type === 'NotFoundError') cb2(null, block); else cb2(err, block);   // Ignore not found errors
        });

        function getBlock(cb3) {
            blockchain.getBlock(blockNumber, (err, b) => {
                block = b;
                cb3(err);
            });
        }
    }
};