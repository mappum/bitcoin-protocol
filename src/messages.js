var struct = require('varstruct')
var varint = require('varuint-bitcoin')
var types = require('./types')

// TODO: add segwit
var tx = struct([
  { name: 'version', type: struct.Int32LE },
  { name: 'ins', type: struct.VarArray(varint, struct([
    { name: 'hash', type: struct.Buffer(32) },
    { name: 'index', type: struct.UInt32LE },
    { name: 'script', type: struct.VarBuffer(varint) },
    { name: 'sequence', type: struct.UInt32LE }
  ])) },
  { name: 'outs', type: struct.VarArray(varint, struct([
    { name: 'valueBuffer', type: struct.Buffer(8) },
    { name: 'script', type: struct.VarBuffer(varint) }
  ])) },
  { name: 'locktime', type: struct.UInt32LE }
])

var reject = (function () {
  var baseStruct = struct([
    { name: 'message', type: struct.VarString(varint, 'ascii') },
    { name: 'ccode', type: struct.UInt8 },
    { name: 'reason', type: struct.VarString(varint, 'ascii') }
  ])

  function encode (value, buffer, offset) {
    if (!buffer) buffer = new Buffer(encodingLength(value))
    if (!offset) offset = 0
    baseStruct.encode(value, buffer, offset)
    encode.bytes = baseStruct.encode.bytes
    if (Buffer.isBuffer(value.data)) {
      if (offset + encode.bytes + value.data.length > buffer.length) {
        throw new RangeError('destination buffer is too small')
      }
      value.data.copy(buffer, offset + encode.bytes)
      encode.bytes += value.data.length
    }
    return buffer
  }

  function decode (buffer, offset, end) {
    if (!offset) offset = 0
    if (!end) end = buffer.length
    var value = baseStruct.decode(buffer, offset, end)
    decode.bytes = baseStruct.decode.bytes
    if (decode.bytes === end) {
      value.data = new Buffer(0)
    } else {
      value.data = buffer.slice(decode.bytes, end)
      decode.bytes = end
    }
    return value
  }

  function encodingLength (value) {
    var dataLength = Buffer.isBuffer(value.data) ? value.data.length : 0
    return baseStruct.encodingLength(value) + dataLength
  }

  return { encode: encode, decode: decode, encodingLength: encodingLength }
})()

// https://bitcoin.org/en/developer-reference#p2p-network
// TODO: move to own files
module.exports = {
  // Data Messages
  block: struct([
    { name: 'version', type: struct.Int32LE },
    { name: 'prevHash', type: struct.Buffer(32) },
    { name: 'merkleRoot', type: struct.Buffer(32) },
    { name: 'timestamp', type: struct.UInt32LE },
    { name: 'bits', type: struct.UInt32LE },
    { name: 'nonce', type: struct.UInt32LE },
    { name: 'transactions', type: struct.VarArray(varint, tx) }
  ]),
  getblocks: struct([
    { name: 'version', type: struct.UInt32BE },
    { name: 'locator', type: struct.VarArray(varint, struct.Buffer(32)) },
    { name: 'hashStop', type: struct.Buffer(32) }
  ]),
  getdata: struct.VarArray(varint, types.InventoryVector),
  getheaders: struct([
    { name: 'version', type: struct.UInt32BE },
    { name: 'locator', type: struct.VarArray(varint, struct.Buffer(32)) },
    { name: 'hashStop', type: struct.Buffer(32) }
  ]),
  headers: struct.VarArray(varint, struct([
    { name: 'version', type: struct.Int32LE },
    { name: 'prevHash', type: struct.Buffer(32) },
    { name: 'merkleRoot', type: struct.Buffer(32) },
    { name: 'timestamp', type: struct.UInt32LE },
    { name: 'bits', type: struct.UInt32LE },
    { name: 'nonce', type: struct.UInt32LE },
    { name: 'numTransactions', type: varint }
  ])),
  inv: struct.VarArray(varint, types.InventoryVector),
  mempool: struct([]),
  merkleblock: struct([
    { name: 'header', type: struct([
      { name: 'version', type: struct.Int32LE },
      { name: 'prevHash', type: struct.Buffer(32) },
      { name: 'merkleRoot', type: struct.Buffer(32) },
      { name: 'timestamp', type: struct.UInt32LE },
      { name: 'bits', type: struct.UInt32LE },
      { name: 'nonce', type: struct.UInt32LE }
    ]) },
    { name: 'hashes', type: struct.VarArray(varint, struct.Buffer(32)) },
    { name: 'flags', type: struct.VarBuffer(varint) }
  ]),
  notfound: struct.VarArray(varint, types.InventoryVector),
  tx: tx,

  // Control Messages
  addr: struct.VarArray(varint, struct([
    { name: 'time', type: struct.UInt32LE },
    { name: 'services', type: struct.Buffer(8) },
    { name: 'address', type: types.IPAddress },
    { name: 'port', type: struct.UInt16BE }
  ])),
  alert: struct([
    { name: 'payload', type: struct.VarBuffer(varint) }, // TODO: parse automatically?
    { name: 'signature', type: struct.VarBuffer(varint) }
  ]),
  filteradd: struct([
    { name: 'data', type: struct.VarBuffer(varint) }
  ]),
  filterload: struct([
    { name: 'data', type: struct.VarBuffer(varint) },
    { name: 'nHashFuncs', type: struct.UInt32LE },
    { name: 'nTweak', type: struct.UInt32LE },
    { name: 'nFlags', type: struct.UInt8 }
  ]),
  filterclear: struct([]),
  getaddr: struct([]),
  ping: struct([ { name: 'nonce', type: struct.Buffer(8) } ]),
  pong: struct([ { name: 'nonce', type: struct.Buffer(8) } ]),
  reject: reject,
  sendheaders: struct([]),
  verack: struct([]),
  version: struct([
    { name: 'version', type: struct.UInt32LE },
    { name: 'services', type: struct.Buffer(8) },
    { name: 'timestamp', type: struct.UInt64LE },
    { name: 'receiverAddress', type: struct([
      { name: 'services', type: struct.Buffer(8) },
      { name: 'address', type: types.IPAddress },
      { name: 'port', type: struct.UInt16BE }
    ]) },
    { name: 'senderAddress', type: struct([
      { name: 'services', type: struct.Buffer(8) },
      { name: 'address', type: types.IPAddress },
      { name: 'port', type: struct.UInt16BE }
    ]) },
    { name: 'nonce', type: struct.Buffer(8) },
    { name: 'userAgent', type: struct.VarString(varint, 'ascii') },
    { name: 'startHeight', type: struct.Int32LE },
    { name: 'relay', type: types.Boolean }
  ])
}
