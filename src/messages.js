const struct = require('varstruct')
const varint = require('varuint-bitcoin')
const types = require('./dataTypes.js')

const versionPeerAddress = types.peerAddress(true)
const peerAddress = types.peerAddress(false)
const buffer32 = struct.Buffer(32)
const buffer8 = struct.Buffer(8)

const NULL_BUFFER = new Buffer(0)

exports.version = struct([
  { name: 'version', type: struct.UInt32LE },
  { name: 'services', type: buffer8 },
  { name: 'timestamp', type: struct.UInt64LE },
  { name: 'receiverAddress', type: versionPeerAddress },
  { name: 'senderAddress', type: versionPeerAddress },
  { name: 'nonce', type: buffer8 },
  { name: 'userAgent', type: struct.VarString(varint, 'utf8') },
  { name: 'startHeight', type: struct.Int32LE },
  { name: 'relay', type: types.boolean }
])

exports.verack =
exports.getaddr =
exports.mempool =
exports.filterclear =
exports.sendheaders = struct([])

exports.addr = struct.VarArray(varint, peerAddress)

exports.inv =
exports.getdata =
exports.notfound = struct.VarArray(varint, types.inventoryVector)

exports.getblocks =
exports.getheaders = struct([
  { name: 'version', type: struct.UInt32BE },
  { name: 'locator', type: struct.VarArray(varint, buffer32) },
  { name: 'hashStop', type: buffer32 }
])

exports.tx = struct([
  { name: 'version', type: struct.Int32LE },
  { name: 'ins', type: struct.VarArray(varint, struct([
    { name: 'hash', type: buffer32 },
    { name: 'index', type: struct.UInt32LE },
    { name: 'script', type: struct.VarBuffer(varint) },
    { name: 'sequence', type: struct.UInt32LE }
  ])) },
  { name: 'outs', type: struct.VarArray(varint, struct([
    { name: 'valueBuffer', type: buffer8 },
    { name: 'script', type: struct.VarBuffer(varint) }
  ])) },
  { name: 'locktime', type: struct.UInt32LE }
])

exports.block = struct([
  { name: 'version', type: struct.Int32LE },
  { name: 'prevHash', type: buffer32 },
  { name: 'merkleRoot', type: buffer32 },
  { name: 'timestamp', type: struct.UInt32LE },
  { name: 'bits', type: struct.UInt32LE },
  { name: 'nonce', type: struct.UInt32LE },
  { name: 'transactions', type: struct.VarArray(varint, exports.tx) }
])

exports.headers = struct.VarArray(varint, struct([
  { name: 'version', type: struct.Int32LE },
  { name: 'prevHash', type: buffer32 },
  { name: 'merkleRoot', type: buffer32 },
  { name: 'timestamp', type: struct.UInt32LE },
  { name: 'bits', type: struct.UInt32LE },
  { name: 'nonce', type: struct.UInt32LE },
  { name: 'numTransactions', type: varint }
]))

exports.ping =
exports.pong = struct([ { name: 'nonce', type: buffer8 } ])

const rejectStruct = struct([
  { name: 'message', type: struct.VarString(varint, 'utf8') },
  { name: 'ccode', type: struct.UInt8 },
  { name: 'reason', type: struct.VarString(varint, 'utf8') }
])
exports.reject = message => types.codec(
  function encode (value, buf) {
    rejectStruct.encode(value, buf)
    var bytes = rejectStruct.encode.bytes
    if (value.data) {
      value.data.copy(buf, bytes)
      bytes += value.data.length
    }
    return bytes
  },

  function decode (buf, d) {
    d.bytes = message.length
    const value = rejectStruct.decode(buf)
    if (message.length > rejectStruct.length) {
      value.data = buf.slice(d.bytes, d.bytes + message.length)
    } else {
      value.data = NULL_BUFFER
    }
    return value
  },

  function encodingLength (value) {
    return rejectStruct.length + (value.data ? value.data.length : 0)
  }
)
const reject = exports.reject()
exports.reject.encode = reject.encode
exports.reject.encodingLength = reject.encodingLength

exports.filterload = struct([
  { name: 'data', type: struct.VarBuffer(varint) },
  { name: 'nHashFuncs', type: struct.UInt32LE },
  { name: 'nTweak', type: struct.UInt32LE },
  { name: 'nFlags', type: struct.UInt8 }
])

exports.filteradd = struct([
  { name: 'data', type: struct.VarBuffer(varint) }
])

exports.merkleblock = struct([
  { name: 'header', type: struct([
    { name: 'version', type: struct.Int32LE },
    { name: 'prevHash', type: buffer32 },
    { name: 'merkleRoot', type: buffer32 },
    { name: 'timestamp', type: struct.UInt32LE },
    { name: 'bits', type: struct.UInt32LE },
    { name: 'nonce', type: struct.UInt32LE }
  ]) },
  { name: 'hashes', type: struct.VarArray(varint, buffer32) },
  { name: 'flags', type: struct.VarBuffer(varint) }
])

exports.alert = struct([
  { name: 'payload', type: struct.VarBuffer(varint) },
  { name: 'signature', type: struct.VarBuffer(varint) }
])
