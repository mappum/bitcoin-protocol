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
  function write (codec, value) {
    codec.encode(value, buffer, offset + encode.bytes)
    encode.bytes += codec.encode.bytes
  }

  if (!buffer) buffer = new Buffer(encodingLength(value))
  if (!offset) offset = 0
  encode.bytes = 0
  write(struct.Int32LE, value.version) // version
  // marker and flags if segwit
  var isSegWit = value.flags && value.scriptWitnesses
  if (isSegWit) {
    write(struct.UInt8, 0x00)
    write(struct.UInt8, value.flags)
  }
  write(inputs, value.ins) // inputs
  write(outputs, value.outs) // outputs
  // witnesses script if segwit
  if (isSegWit) {
    write(types.VarBuffer, value.scriptWitnesses)
  }
  write(struct.UInt32LE, value.locktime) // locktime
  return buffer
}

function decode (buffer, offset, end) {
  function read (codec) {
    var output = codec.decode(buffer, offset + decode.bytes, end)
    decode.bytes += codec.decode.bytes
    return output
  }
  if (!offset) offset = 0
  if (!end) end = buffer.length
  var value = {}
  decode.bytes = 0
  value.version = read(struct.Int32LE) // version
  // check marker for segwit
  var isSegWit = buffer[offset + decode.bytes] === 0x00
  if (isSegWit) {
    decode.bytes += 1
    value.flags = read(struct.UInt8)
  }
  value.ins = read(inputs) // inputs
  value.outs = read(outputs) // outputs
  // witnesses script if segwit
  if (isSegWit) {
    value.scriptWitnesses = read(types.VarBuffer)
  }
  value.locktime = read(struct.UInt32LE) // locktime
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
