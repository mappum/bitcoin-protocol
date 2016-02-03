'use strict'

const struct = require('varstruct')
const ip = require('ip')
const BN = require('bn.js')

const MAX_NUMBER = 0x1fffffffffffff
const IPV4_PREFIX = new Buffer('00000000000000000000ffff', 'hex')

function codec (_encode, _decode, _encodingLength, length) {
  const encodingLength = _encodingLength || (() => length)

  function encode (value, buf, offset) {
    if (typeof buf === 'number') {
      offset = buf
      buf = null
    } else if (offset && buf) {
      buf = buf.slice(offset)
    }
    buf = buf || new Buffer(_encodingLength(value))
    encode.bytes = _encode(value, buf)
    if (length != null) encode.bytes = length
    return buf
  }

  function decode (buf, start, end) {
    start = start || 0
    end = end || buf.length
    buf = buf.slice(start, end)
    if (length != null) decode.bytes = length
    return _decode(buf, decode, arguments)
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

const varint = exports.varint = codec(
  function encode (n, buf) {
    if (n % 1) throw new Error('Varint value must be an integer')
    if (n < 0xfd) {
      buf.writeUInt8(n, 0)
      return 1
    }
    if (n <= 0xffff) {
      buf.writeUInt8(0xfd, 0)
      buf.writeUInt16LE(n, 1)
      return 3
    }
    if (n <= 0xffffffff) {
      buf.writeUInt8(0xfe, 0)
      buf.writeUInt32LE(n, 1)
      return 5
    }
    if (n <= MAX_NUMBER) {
      buf.writeUInt8(0xff, 0)
      buf.writeInt32LE(n & -1, 1)
      buf.writeUInt32LE(Math.floor(n / 0x100000000), 5)
      return 9
    }
    throw new Error('Value exceeds maximum Javascript integer (53 bits)')
  },

  function decode (buf, d) {
    const first = buf.readUInt8(0)
    if (first < 0xfd) {
      d.bytes = 1
      return first
    }
    if (first === 0xfd) {
      d.bytes = 3
      return buf.readUInt16LE(1)
    }
    if (first === 0xfe) {
      d.bytes = 5
      return buf.readUInt32LE(1)
    }
    if (first === 0xff) {
      d.bytes = 9
      const bottom = buf.readUInt32LE(1)
      const top = buf.readUInt32LE(5)
      const n = top * 0xffffffff + bottom
      if (n > MAX_NUMBER) throw new Error('Value exceeds maximum Javascript integer (53 bits)')
      return n
    }
  },

  function encodingLength (n) {
    if (n < 0xfd) return 1
    if (n <= 0xffff) return 3
    if (n <= 0xffffffff) return 5
    return 9
  }
)

exports.string = codec(
  function encode (s, buf) {
    if (Buffer.byteLength(s) > buf.length) {
      throw new Error('String value is larger than Buffer')
    }
    if (s.length === 0) {
      buf.writeUInt8(0, 0)
      return 1
    }
    return buf.write(s)
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
    buf.fill(0, bytes)
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

exports.Int64LE = codec(
  function encode (bn, buf) {
    bn.toBuffer().copy(buf.slice(0, 8))
  },
  function decode (buf, d) {
    return new BN(buf.slice(0, 8).toString('hex'), 'hex')
  },
  null, 8
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
  const addr = {}
  if (!noTime) addr.time = struct.UInt32LE
  addr.services = buffer(8)
  addr.address = ipAddress
  addr.port = struct.UInt16BE
  return struct(addr)
}

exports.inventoryVector = struct({
  type: struct.UInt32LE,
  hash: buffer(32)
})
