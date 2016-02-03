const through = require('through2')
const vstruct = require('varstruct')
const createHash = require('create-hash')
const dataTypes = require('./dataTypes.js')
const messages = require('./messages.js')

function getChecksum (data) {
  return createHash('sha256')
    .update(createHash('sha256').update(data).digest())
    .digest()
    .slice(0, 4)
}

const messageHeader = vstruct({
  magic: vstruct.UInt32LE,
  command: dataTypes.fixedString(12),
  length: vstruct.UInt32LE,
  checksum: vstruct.buffer(4)
})

function createDecodeStream () {
  return through.obj(function (chunk, enc, cb) {
    while (chunk.length > 0) {
      const message = messageHeader.decode(chunk)
      chunk = chunk.slice(messageHeader.decode.bytes)
      if (message.length > chunk.length) {
        return cb(new Error('Incomplete message data'))
      }

      const command = messages[message.command]
      if (!command) {
        return cb(new Error(`Unrecognized command: "${message.command}"`))
      }

      const payload = chunk.slice(0, message.length)
      const checksum = getChecksum(payload)
      if (checksum.compare(message.checksum) !== 0) {
        return cb(new Error(`Invalid message checksum. ` +
          `Expected "${message.checksum.toString('hex')}", ` +
          `got "${checksum.toString('hex')}"`))
      }

      try {
        message.payload = command.decode(payload)
      } catch (err) {
        return cb(err)
      }
      if (command.decode.bytes !== message.length) {
        return cb(new Error('Message length did not match header'))
      }

      chunk = chunk.slice(message.length)
      this.push(message)
    }
    cb(null)
  })
}

function createEncodeStream () {
  return through.obj(function (chunk, enc, cb) {
    const command = messages[chunk.command]
    if (!command) {
      return cb(new Error(`Unrecognized command: "${chunk.command}"`))
    }

    var payload
    try {
      payload = command.encode(chunk.payload)
    } catch (err) {
      return cb(err)
    }

    chunk.length = command.encode.bytes
    chunk.checksum = getChecksum(payload)
    var header
    try {
      header = messageHeader.encode(chunk)
    } catch (err) {
      return cb(err)
    }

    this.push(header)
    this.push(payload)
    cb(null)
  })
}

module.exports = {
  createDecodeStream,
  createEncodeStream
}
