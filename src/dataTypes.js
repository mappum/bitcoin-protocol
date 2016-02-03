'use strict'

const vstruct = require('varstruct')
const ip = require('ip')

const MAX_NUMBER = 0x1fffffffffffff
const IPV4_PREFIX = new Buffer('00000000000000000000ffff', 'hex')

function codec (_encode, _decode, _encodingLength) {
  function encode (value, buffer, offset) {
    if (typeof buffer === 'number') {
      offset = buffer
      buffer = null
    } else if (offset && buffer) {
      buffer = buffer.slice(offset)
    }
    buffer = buffer || new Buffer(_encodingLength(value))
    encode.bytes = _encode(value, buffer)
    return buffer
  }

  function decode (buffer, start, end) {
    start = start || 0
    end = end || buffer.length
    buffer = buffer.slice(start, end)
    return _decode(buffer, decode, arguments)
  }

  encode.bytes = decode.bytes = 0
  return { encode, decode, encodingLength: _encodingLength }
}

exports.buffer = length => codec(
  function encode (value, buf) {
    if (value.length !== length) {
      throw new Error(`Expected Buffer of length ${length}, got length ${value.length}`)
    }
    value.copy(buf)
    return length
  },

  function decode (buf, d) {
    d.bytes = length
    return buf.slice(0, length)
  },

  function encodingLength () {
    return length
  }
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
    return buf.write(s)
  },

  function decode (buf, d) {
    const length = varint.decode(buf)
    d.bytes = varint.decode.bytes + length
    return buf.slice(varint.decode.bytes, length).toString('utf8')
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
    return length
  },

  function decode (buf, d) {
    d.bytes = length
    var firstZero = null
    for (let i = 0; i < length; i++) {
      if (buf[i] === 0 && firstZero == null) firstZero = i
      else if (buf[i] !== 0 && firstZero != null) {
        throw new Error('Found a non-null byte after the first null byte in a null-padded string')
      }
    }
    return buf.slice(0, firstZero).toString('utf8')
  },

  function encodingLength (s) {
    return length
  }
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
    return 16
  },

  function decode (buf, d) {
    d.bytes = 16
    if (buf.slice(0, 12).compare(IPV4_PREFIX) === 0) {
      return ip.toString(buf, 12, 16)
    }
    return ip.toString(buf, 0, 16)
  },

  function encodingLength (s) {
    return 16
  }
)

exports.peerAddress = noTime => {
  const struct = {}
  if (!noTime) struct.time = vstruct.UInt32LE
  struct.services = vstruct.buffer(8)
  struct.address = ipAddress
  struct.port = vstruct.UInt16LE
  return vstruct(struct)
}

exports.inventoryVector = vstruct({
  type: vstruct.UInt32LE,
  hash: vstruct.buffer(32)
})
