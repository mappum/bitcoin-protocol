'use strict'

const struct = require('varstruct')
const ip = require('ip')
const varint = require('varuint-bitcoin')

const IPV4_PREFIX = new Buffer('00000000000000000000ffff', 'hex')

const codec =
exports.codec =
function (_encode, _decode, _encodingLength, length) {
  const encodingLength = _encodingLength || (() => length)

  function encode (value, buf, offset) {
    if (typeof buf === 'number') {
      offset = buf
      buf = null
    }
    buf = buf || new Buffer(_encodingLength(value))
    encode.bytes = _encode(value, buf.slice(offset || 0))
    if (length != null) encode.bytes = length
    return buf
  }

  function decode (buf, start, end) {
    start = start || 0
    end = end || buf.length
    buf = buf.slice(start, end)
    const value = _decode(buf, decode)
    if (length != null) {
      decode.bytes = length
    }
    return value
  }

  encode.bytes = decode.bytes = 0
  return { encode, decode, encodingLength, length }
}

exports.boolean = codec(
  function encode (value, buf) {
    buf.writeUInt8(+!!value, 0)
  },
  function decode (buf, d) {
    return !!buf.readUInt8(0)
  },
  null, 1
)

const ipAddress = exports.ipAddress = codec(
  function encode (addr, buf) {
    if (ip.isV4Format(addr)) {
      IPV4_PREFIX.copy(buf)
      ip.toBuffer(addr, buf, 12)
    } else if (ip.isV6Format(addr)) {
      ip.toBuffer(addr, buf)
    } else {
      throw new Error('Invalid IP address value')
    }
  },
  function decode (buf, d) {
    if (buf.slice(0, 12).compare(IPV4_PREFIX) === 0) {
      return ip.toString(buf.slice(12, 16))
    }
    return ip.toString(buf.slice(0, 16))
  },
  null, 16
)

exports.peerAddress = noTime => {
  const addr = [
    { name: 'services', type: struct.Buffer(8) },
    { name: 'address', type: ipAddress },
    { name: 'port', type: struct.UInt16BE }
  ]
  if (!noTime) addr.unshift({ name: 'time', type: struct.UInt32LE })
  return struct(addr)
}

exports.inventoryVector = struct([
  { name: 'type', type: struct.UInt32LE },
  { name: 'hash', type: struct.Buffer(32) }
])

exports.alertPayload = struct([
  { name: 'version', type: struct.Int32LE },
  { name: 'relayUntil', type: struct.UInt64LE },
  { name: 'expiration', type: struct.UInt64LE },
  { name: 'id', type: struct.Int32LE },
  { name: 'cancel', type: struct.Int32LE },
  { name: 'cancelSet', type: struct.VarArray(varint, struct.Int32LE) },
  { name: 'minVer', type: struct.Int32LE },
  { name: 'maxVer', type: struct.Int32LE },
  { name: 'subVerSet', type: struct.VarArray(varint, struct.VarString(varint, 'utf8')) },
  { name: 'priority', type: struct.Int32LE },
  { name: 'comment', type: struct.VarString(varint, 'utf8') },
  { name: 'statusBar', type: struct.VarString(varint, 'utf8') },
  { name: 'reserved', type: struct.VarString(varint, 'utf8') }
])
