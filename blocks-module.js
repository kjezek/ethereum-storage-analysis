const Blockchain = require('ethereumjs-blockchain').default;
const utils = require('ethereumjs-util');
const async = require("async");
const level = require('level');
const rlp = require('rlp');
const SecTrie = require('merkle-patricia-tree/secure');
const Trie = require('merkle-patricia-tree/baseTrie');

let db;
let blockchainOpts;

// Open the RocksDB
exports.init = function(DB_PATH) {
    const dbOptions = {  };
    db = level(DB_PATH, dbOptions)
    blockchainOpts = { db: db, hardfork:  "byzantium", validate : false }
};


/**
 * Iterate all blocks. It starts from the latest one and goes to parents via parent hash
 */
exports.iterateBlocks = function (cb1) {
    const blockchain =  new Blockchain(blockchainOpts);

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

    /**
     * Read the last block from the DB
     * @param cb
     */
    function getLatestBlocks(cb) {
        blockchain.getLatestBlock((err, block) => {
            const blockNumber = utils.bufferToInt(block.header.number);
            const blockHash = block.hash().toString('hex');
            console.log(err || `LATEST BLOCK ${blockNumber}: ${blockHash}`)
            cb(err, block);
        });
    }
};


/**
 * Iterate blocks between Start and End number.
 */
exports.iterateBlocks2 = function (start, end, cb1) {
    const blockchain =  new Blockchain(blockchainOpts);

    let blockNumber = start;

    // iterate all blocks until there is no previous block
    // WHIST is a loop - it contains condition, next, and error callback
    async.whilst(cb => cb(null, blockNumber < end),  // check condition
        run,        // run next, callback must receive error and result obj.
        err =>  (cb1(err)) // end condition
    );

    function run(cb2) {
        let block;

        blockchain.getBlock(blockNumber, (err, b) => {
            block = b;
            blockNumber += 1;

            if (block) cb1(err, block, block.hash());  // callback only if we have data
            if (err && err.type === 'NotFoundError') cb2(null, block); else cb2(err, block);   // Ignore not found errors
        });
    }
};

function streamOnTrie(trie, cb1) {
    let stream = trie.createReadStream()
        .on('data', function (data) {
            cb1(data.key, data.value);
        })
        .on('end', function () {
            cb1(null, null);  // signal end
        })
}

/**
 * Iterate over all accounts of a block
 * @param root trie root
 * @param cb1 callback
 */
exports.iterateSecureTrie = function(root, cb1) {
    let trie = new SecTrie(db, root);
    streamOnTrie(trie, cb1);
};

/**
 * Iterate over all transactions of a block
 * @param root trie root
 * @param cb1 callback
 */
exports.iterateTrie = function(root, cb1) {
    let trie = new Trie(db, root);
    streamOnTrie(trie, cb1);
};