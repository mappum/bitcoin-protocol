var struct = require('varstruct')
var varint = require('varuint-bitcoin')

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

module.exports = {
  encode: encode,
  decode: decode,
  encodingLength: encodingLength
}
