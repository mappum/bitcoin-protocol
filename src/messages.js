const struct = require('varstruct')
const types = require('./dataTypes.js')

const versionPeerAddress = types.peerAddress(true)
const peerAddress = types.peerAddress(false)
const buffer32 = types.buffer(32)
const buffer8 = types.buffer(8)

const NULL_BUFFER = new Buffer(0)

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
  version: struct.Int32LE,
  ins: types.vararray(types.varint, struct({
    hash: buffer32,
    index: struct.UInt32LE,
    script: struct.varbuf(types.varint),
    sequence: struct.UInt32LE
  })),
  outs: types.vararray(types.varint, struct({
    valueBuffer: buffer8,
    script: struct.varbuf(types.varint)
  })),
  locktime: struct.UInt32LE
})

exports.block = struct({
  version: struct.Int32LE,
  prevHash: buffer32,
  merkleRoot: buffer32,
  timestamp: struct.UInt32LE,
  bits: struct.UInt32LE,
  nonce: struct.UInt32LE,
  transactions: types.vararray(types.varint, exports.tx)
})

exports.headers = types.vararray(types.varint, types.header)

exports.ping =
exports.pong = struct({ nonce: buffer8 })

const rejectStruct = struct({
  message: types.varstring,
  ccode: struct.UInt8,
  reason: types.varstring
})
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
  header: types.header,
  hashes: types.vararray(types.varint, buffer32),
  flags: struct.varbuf(types.varint)
})

exports.alert = struct({
  payload: struct.varbuf(types.varint),
  signature: struct.varbuf(types.varint)
})
