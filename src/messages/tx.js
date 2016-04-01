var struct = require('varstruct')
var varint = require('varuint-bitcoin')
var types = require('../types')

// TODO: add segwit
module.exports = struct([
  { name: 'version', type: struct.Int32LE },
  { name: 'ins', type: struct.VarArray(varint, struct([
    { name: 'hash', type: types.Buffer32 },
    { name: 'index', type: struct.UInt32LE },
    { name: 'script', type: types.VarBuffer },
    { name: 'sequence', type: struct.UInt32LE }
  ])) },
  { name: 'outs', type: struct.VarArray(varint, struct([
    { name: 'valueBuffer', type: types.Buffer8 },
    { name: 'script', type: types.VarBuffer }
  ])) },
  { name: 'locktime', type: struct.UInt32LE }
])
