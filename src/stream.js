'use strict'

const BufferList = require('bl')
const through = require('through2')
const struct = require('varstruct')
const createHash = require('create-hash')
const types = require('./dataTypes.js')
const messages = require('./messages.js')

function getChecksum (data) {
  return createHash('sha256')
    .update(createHash('sha256').update(data).digest())
    .digest()
    .slice(0, 4)
}

const messageHeader = struct({
  magic: struct.UInt32LE,
  command: types.fixedString(12),
  length: struct.UInt32LE,
  checksum: types.buffer(4)
})

function createDecodeStream (opts) {
  opts = opts || {}
  var bl = new BufferList()
  var message
  return through.obj(function (chunk, enc, cb) {
    bl.append(chunk)
    while (bl.length > 0) {
      if (!message) {
        if (messageHeader.length > chunk.length) break
        try {
          message = messageHeader.decode(chunk)
        } catch (err) {
          return cb(err)
        }
        if (opts.magic && message.magic !== opts.magic) {
          return cb(new Error(`Magic value in message ` +
            `(${message.magic.toString(16)}) did not match expected ` +
            `(${opts.magic.toString(16)})`))
        }
        bl.consume(messageHeader.decode.bytes)
        if (message.length > bl.length) break
      }

      let command = messages[message.command]
      if (!command) {
        return cb(new Error(`Unrecognized command: "${message.command}"`))
      }

      let payload = bl.slice(0, message.length)
      let checksum = getChecksum(payload)
      if (checksum.compare(message.checksum) !== 0) {
        return cb(new Error(`Invalid message checksum. ` +
          `In header: "${message.checksum.toString('hex')}", ` +
          `calculated: "${checksum.toString('hex')}"`))
      }

      try {
        message.payload = command.decode(payload)
      } catch (err) {
        return cb(err)
      }
      if (command.decode.bytes !== message.length) {
        console.log('message', message)
        return cb(new Error('Message length did not match header. ' +
          `In header: ${message.length}, read: ${command.decode.bytes}`))
      }

      bl.consume(message.length)
      this.push(message)
      message = null
    }
    cb(null)
  })
}

function createEncodeStream (opts) {
  opts = opts || {}
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
    chunk.magic = chunk.magic || opts.magic
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
