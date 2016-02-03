const struct = require('varstruct')
const types = require('./dataTypes.js')

const versionPeerAddress = types.peerAddress(true)
const peerAddress = types.peerAddress(false)
const buffer32 = types.buffer(32)
const buffer8 = types.buffer(8)

exports.version = struct({
  version: struct.UInt32LE,
  services: buffer8,
  timestamp: struct.UInt64LE,
  receiverAddress: versionPeerAddress,
  senderAddress: versionPeerAddress,
  nonce: buffer8,
  userAgent: types.varstring,
  startHeight: struct.Int32LE,
  relay: types.boolean
})

exports.verack =
exports.getaddr =
exports.mempool =
exports.filterclear = struct({})

exports.addr = types.vararray(types.varint, peerAddress)

exports.inv =
exports.getdata =
exports.notfound = types.vararray(types.varint, types.inventoryVector)

exports.getblocks =
exports.getheaders = struct({
  version: struct.UInt32,
  locator: types.vararray(types.varint, buffer32),
  hashStop: buffer32
})

exports.tx = struct({
  version: struct.Int32BE,
  in: types.vararray(types.varint, struct({
    prevOut: struct({
      txid: buffer32,
      index: struct.UInt32LE
    }),
    scriptSig: struct.varbuf(types.varint),
    sequence: struct.UInt32LE
  })),
  out: types.vararray(types.varint, struct({
    value: types.Int64LE,
    scriptPubKey: struct.varbuf(types.varint)
  })),
  lockTime: struct.UInt32LE
})

exports.block = struct({
  version: struct.Int32BE,
  prevBlock: buffer32,
  merkleRoot: buffer32,
  timestamp: struct.UInt32LE,
  bits: struct.UInt32LE,
  nonce: struct.UInt32LE,
  transactions: types.vararray(types.varint, exports.tx)
})

exports.headers = types.vararray(types.varint, struct({
  version: struct.Int32BE,
  prevBlock: buffer32,
  merkleRoot: buffer32,
  timestamp: struct.UInt32LE,
  bits: struct.UInt32LE,
  nonce: struct.UInt32LE,
  nTransactions: types.varint
}))

exports.ping =
exports.pong = struct({ nonce: buffer8 })

const rejectStruct = struct({
  message: types.varstring,
  ccode: struct.UInt8,
  reason: types.varstring
})
const rejectDataLengths = {
  0x40: 32,
  0x41: 32,
  0x42: 32,
  0x43: 32
}
exports.reject = types.codec(
  function encode (value, buf) {
    rejectStruct.encode(value, buf)
    var bytes = rejectStruct.encode.bytes
    const dataLength = rejectDataLengths[value.ccode]
    if (dataLength) {
      value.data.copy(buf, bytes)
      bytes += 32
    }
    return bytes
  },

  function decode (buf, d) {
    const value = rejectStruct.decode(buf)
    d.bytes = rejectStruct.decode.bytes
    const dataLength = rejectDataLengths[value.ccode]
    if (dataLength) {
      value.data = buf.slice(d.bytes, d.bytes + dataLength)
      d.bytes += dataLength
    }
    return value
  },

  function encodingLength (value) {
    var bytes = rejectStruct.encodingLength(value)
    bytes += rejectDataLengths[value.ccode] || 0
    return bytes
  }
)

exports.filterload = struct({
  data: struct.varbuf(types.varint),
  nHashFuncs: struct.UInt32LE,
  nTweak: struct.UInt32LE,
  nFlags: struct.UInt8
})

exports.filteradd = struct({
  data: struct.varbuf(types.varint)
})

exports.merkleblock = struct({
  header: exports.headers,
  hashes: types.vararray(types.varint, buffer32),
  flags: struct.varbuf(types.varint)
})

exports.alert = struct({
  payload: struct.varbuf(types.varint),
  signature: struct.varbuf(types.varint)
})
