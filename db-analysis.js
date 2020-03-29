const DB_PATH="/Users/kjezek/projects/_etherum_data/io.parity.3/"

const level = require('level-rocksdb')
const Blockchain = require('ethereumjs-blockchain').default
const utils = require('ethereumjs-util')

// Open the RocksDB
var dbOptions = { };
const db = level(DB_PATH, dbOptions)

// Iterate all blocks
new Blockchain({ db: db }).iterator('i',
    (block, reorg, cb) => {
      const blockNumber = utils.bufferToInt(block.header.number)
      const blockHash = block.hash().toString('hex')
      console.log(`BLOCK ${blockNumber}: ${blockHash}`)
      cb()
    },
    err => console.log(err || 'Done.'),
  )
