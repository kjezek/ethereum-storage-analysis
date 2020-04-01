const DB_PATH="/Users/kjezek/Library/Ethereum/geth/chaindata"
// const DB_PATH="/Users/kjezek/Library/Application Support/io.parity.ethereum/chains/ethereum/db/906a34e69aec8c0d/overlayrecent/db"



// const level = require('level-rocksdb')
const level = require('level');
const Blockchain = require('ethereumjs-blockchain').default;
const utils = require('ethereumjs-util');
const async = require("async");

// Open the RocksDB
const dbOptions = {  };
const db = level(DB_PATH, dbOptions)

const blockchainOpts = { db: db, hardfork:  "byzantium", validate : false }
const blockchain =  new Blockchain(blockchainOpts);

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
 * Iterate all blocks
 */
iterateBlocks = function (cb1) {

    let blockHash;

    /** Start iteration by finding the latest block. */
    getLatestBlocks((err, block) => {

        if (err) return cb1(err);

        blockHash = block.hash();
        // iterate all blocks until there is no previous block
        // WHIST is a loop - it contains condition, next, and error callback
        async.whilst(cb => cb(null, blockHash),  // check condition
            run,        // run next
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
            async.series([blockchain.getBlock(blockHash, (err, b) => {
                block = b;
                cb3(err);
            })]);

        }
    }


};

iterateBlocks((err, block, blockHash) => {
    const blockNumber = utils.bufferToInt(block.header.number);
    const blockHashStr = blockHash.toString('hex');
    console.log(err || `BLOCK ${blockNumber}: ${blockHashStr}`)
});



// Iterate all blocks
// blockchain.iterator('i',
//     (block, reorg, cb) => {
//       const blockNumber = utils.bufferToInt(block.header.number)
//       const blockHash = block.hash().toString('hex')
//       console.log(`BLOCK ${blockNumber}: ${blockHash}`)
//       cb()
//     },
//     err => console.log(err || 'Done.'),
//   );
