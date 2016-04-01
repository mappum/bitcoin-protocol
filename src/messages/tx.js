var struct = require('varstruct')
var varint = require('varuint-bitcoin')
var types = require('../types')

var inputs = struct.VarArray(varint, struct([
  { name: 'hash', type: types.Buffer32 },
  { name: 'index', type: struct.UInt32LE },
  { name: 'script', type: types.VarBuffer },
  { name: 'sequence', type: struct.UInt32LE }
]))

var outputs = struct.VarArray(varint, struct([
  { name: 'valueBuffer', type: types.Buffer8 },
  { name: 'script', type: types.VarBuffer }
]))

function encode (value, buffer, offset) {
  if (!buffer) buffer = new Buffer(encodingLength(value))
  if (!offset) offset = 0
  encode.bytes = 0
  // version
  struct.Int32LE.encode(value.version, buffer, offset + encode.bytes)
  encode.bytes += struct.Int32LE.encode.bytes
  // marker and flags if segwit
  var isSegWit = value.flags && value.scriptWitnesses
  if (isSegWit) {
    buffer[offset + encode.bytes] = 0x00
    encode.bytes += 1
    struct.UInt8.encode(value.flags, buffer, offset + encode.bytes)
    encode.bytes += struct.UInt8.encode.bytes
  }
  // inputs
  inputs.encode(value.ins, buffer, offset + encode.bytes)
  encode.bytes += inputs.encode.bytes
  // outputs
  outputs.encode(value.outs, buffer, offset + encode.bytes)
  encode.bytes += outputs.encode.bytes
  // witnesses script if segwit
  if (isSegWit) {
    types.VarBuffer.encode(value.scriptWitnesses, buffer, offset + encode.bytes)
    encode.bytes += types.VarBuffer.encode.bytes
  }
  // locktime
  struct.UInt32LE.encode(value.locktime, buffer, offset + encode.bytes)
  encode.bytes += struct.UInt32LE.encode.bytes
  return buffer
}

function decode (buffer, offset, end) {
  if (!offset) offset = 0
  if (!end) end = buffer.length
  var value = {}
  decode.bytes = 0
  // version
  value.version = struct.Int32LE.decode(buffer, offset + decode.bytes, end)
  decode.bytes += struct.Int32LE.decode.bytes
  // check marker for segwit
  var isSegWit = buffer[offset + decode.bytes] === 0x00
  if (isSegWit) {
    decode.bytes += 1
    value.flags = struct.UInt8.decode(buffer, offset + decode.bytes, end)
    decode.bytes += struct.UInt8.decode.bytes
  }
  // inputs
  value.ins = inputs.decode(buffer, offset + decode.bytes, end)
  decode.bytes += inputs.decode.bytes
  // outputs
  value.outs = outputs.decode(buffer, offset + decode.bytes, end)
  decode.bytes += outputs.decode.bytes
  // witnesses script if segwit
  if (isSegWit) {
    value.scriptWitnesses = types.VarBuffer.decode(buffer, offset + decode.bytes, end)
    decode.bytes += types.VarBuffer.decode.bytes
  }
  // locktime
  value.locktime = struct.UInt32LE.decode(buffer, offset + decode.bytes, end)
  decode.bytes += struct.UInt32LE.decode.bytes
  return value
}

function encodingLength (value) {
  var size = inputs.encodingLength(value.ins) + outputs.encodingLength(value.outs) + 8
  if (value.segwit) size += 2 + types.VarBuffer(value.scriptWitnesses)
  return size
}

module.exports = {
  encode: encode,
  decode: decode,
  encodingLength: encodingLength
}
