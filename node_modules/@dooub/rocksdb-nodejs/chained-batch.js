const util = require('util')
const AbstractChainedBatch = require('abstract-leveldown').AbstractChainedBatch
const binding = require('./binding')

function ChainedBatch (db) {
  AbstractChainedBatch.call(this, db)
  this.context = binding.batch_init(db.context)
}

ChainedBatch.prototype.putWithColumnFamily = function (columnFamily, key, value) {
  this._checkWritten()

  var err = this.db._checkKey(key) || this.db._checkValue(value)
  if (err) throw err

  key = this.db._serializeKey(key)
  value = this.db._serializeValue(value)

  binding.batch_put_with_column_families(this.context, columnFamily, key, value)

  return this
}

ChainedBatch.prototype._put = function (key, value) {
  binding.batch_put(this.context, key, value)
}

ChainedBatch.prototype._del = function (key) {
  binding.batch_del(this.context, key)
}

ChainedBatch.prototype.delWithColumnFamily = function (columnFamily, key) {
  this._checkWritten()

  var err = this.db._checkKey(key)
  if (err) throw err

  key = this.db._serializeKey(key)
  binding.batch_del_with_column_families(this.context, columnFamily, key)

  return this
}

ChainedBatch.prototype._clear = function () {
  binding.batch_clear(this.context)
}

ChainedBatch.prototype._write = function (options, callback) {
  binding.batch_write(this.context, options, callback)
}

util.inherits(ChainedBatch, AbstractChainedBatch)

module.exports = ChainedBatch
