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

const buffer = exports.buffer = length => codec(
  function encode (value, buf) {
    if (value.length !== length) {
      throw new Error(`Expected Buffer of length ${length}, got length ${value.length}`)
    }
    value.copy(buf)
  },
  function decode (buf, d) {
    return buf.slice(0, length)
  },
  null, length
)

const varstring =
exports.varstring = codec(
  function encode (s, buf) {
    var length = Buffer.byteLength(s)
    if (length > buf.length) {
      throw new Error('String value is larger than Buffer')
    }
    if (s.length === 0) {
      buf.writeUInt8(0, 0)
      return 1
    }
    varint.encode(length, buf)
    return buf.write(s, varint.encode.bytes)
  },

  function decode (buf, d) {
    const length = varint.decode(buf)
    const bytes = varint.decode.bytes
    d.bytes = bytes + length
    return buf.slice(bytes, bytes + length).toString('utf8')
  },

  function encodingLength (s) {
    const length = Buffer.byteLength(s)
    return varint.encodingLength(length) + length
  }
)

exports.fixedString = length => codec(
  function encode (s, buf) {
    if (Buffer.byteLength(s) > length) {
      throw new Error('String length is out of bounds')
    }
    const bytes = buf.write(s)
    buf.fill(0, bytes, length)
  },

  function decode (buf, d) {
    var firstZero = null
    for (let i = 0; i < length; i++) {
      if (buf[i] === 0 && firstZero == null) firstZero = i
      else if (buf[i] !== 0 && firstZero != null) {
        throw new Error('Found a non-null byte after the first null byte in a null-padded string')
      }
    }
    return buf.slice(0, firstZero).toString('utf8')
  },
  null, length
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
    { name: 'services', type: buffer(8) },
    { name: 'address', type: ipAddress },
    { name: 'port', type: struct.UInt16BE }
  ]
  if (!noTime) addr.unshift({ name: 'time', type: struct.UInt32LE })
  return struct(addr)
}

exports.inventoryVector = struct([
  { name: 'type', type: struct.UInt32LE },
  { name: 'hash', type: buffer(32) }
])

const vararray =
exports.vararray = (lenType, itemType) => codec(
  function encode (array, buf) {
    if (!Array.isArray(array)) {
      throw new Error('Value must be an array')
    }
    lenType.encode(array.length, buf)
    var bytes = lenType.encode.bytes
    for (let item of array) {
      itemType.encode(item, buf, bytes)
      bytes += itemType.encode.bytes
    }
    return bytes
  },

  function decode (buf, d) {
    const length = lenType.decode(buf)
    d.bytes = lenType.decode.bytes
    buf = buf.slice(lenType.decode.bytes)
    const array = new Array(length)
    for (let i = 0; i < length; i++) {
      array[i] = itemType.decode(buf)
      d.bytes += itemType.decode.bytes
      buf = buf.slice(itemType.decode.bytes)
    }
    return array
  },

  function encodingLength (array) {
    var length = lenType.encodingLength(array.length)
    for (let item of array) {
      length += itemType.encodingLength(item)
    }
    return length
  }
)

exports.alertPayload = struct([
  { name: 'version', type: struct.Int32LE },
  { name: 'relayUntil', type: struct.UInt64LE },
  { name: 'expiration', type: struct.UInt64LE },
  { name: 'id', type: struct.Int32LE },
  { name: 'cancel', type: struct.Int32LE },
  { name: 'cancelSet', type: vararray(varint, struct.Int32LE) },
  { name: 'minVer', type: struct.Int32LE },
  { name: 'maxVer', type: struct.Int32LE },
  { name: 'subVerSet', type: vararray(varint, varstring) },
  { name: 'priority', type: struct.Int32LE },
  { name: 'comment', type: varstring },
  { name: 'statusBar', type: varstring },
  { name: 'reserved', type: varstring }
])
