'use strict'
var BufferList = require('bl')
var through = require('through2').obj
var struct = require('varstruct')
var createHash = require('create-hash')
var bufferEquals = require('buffer-equals')
var types = require('./types')
var bitcoinMessages = require('./messages')

function getChecksum (data) {
  var tmp = createHash('sha256').update(data).digest()
  return createHash('sha256').update(tmp).digest().slice(0, 4)
}

var messageHeader = struct([
  { name: 'magic', type: struct.UInt32LE },
  { name: 'command', type: types.MessageCommand },
  { name: 'length', type: struct.UInt32LE },
  { name: 'checksum', type: struct.Buffer(4) }
])

var HEADER_LENGTH = messageHeader.encodingLength({
  magic: 0,
  command: '',
  length: 0,
  checksum: new Buffer('01234567', 'hex')
})

exports.createDecodeStream = function (opts) {
  opts = opts || {}
  var messages = opts.messages ? opts.messages : bitcoinMessages
  var bl = new BufferList()
  var message
  return through(function (chunk, enc, cb) {
    bl.append(chunk)
    while (bl.length > 0) {
      if (!message) {
        if (HEADER_LENGTH > bl.length) break
        try {
          message = messageHeader.decode(bl.slice(0, HEADER_LENGTH))
        } catch (err) {
          return cb(err)
        }

        if (opts.magic && message.magic !== opts.magic) {
          return cb(new Error('Magic value in message ' +
            '(' + message.magic.toString(16) + ') did not match expected ' +
            '(' + opts.magic.toString(16) + ')'))
        }

        if (!messages[message.command]) {
          return cb(new Error('Unrecognized command: "' + message.command + '"'))
        }

        bl.consume(messageHeader.decode.bytes)
      }
      if (message.length > bl.length) break

      var payload = bl.slice(0, message.length)
      var checksum = getChecksum(payload)
      if (!bufferEquals(checksum, message.checksum)) {
        return cb(new Error('Invalid message checksum. ' +
          'In header: "' + message.checksum.toString('hex') + '", ' +
          'calculated: "' + checksum.toString('hex') + '"'))
      }

      var command = messages[message.command]
      if (typeof command === 'function') {
        command = command(message, payload)
      }

      try {
        message.payload = command.decode(payload)
      } catch (err) {
        return cb(err)
      }
      if (command.decode.bytes !== message.length) {
        return cb(new Error('Message length did not match header. ' +
          'In header: ' + message.length + ', read: ' + command.decode.bytes))
      }

      bl.consume(message.length)
      this.push(message)
      message = null
    }
    cb(null)
  })
}

exports.createEncodeStream = function (opts) {
  opts = opts || {}
  var messages = opts.messages ? opts.messages : bitcoinMessages
  return through(function (chunk, enc, cb) {
    var command = messages[chunk.command]
    if (!command) {
      return cb(new Error('Unrecognized command: "' + chunk.command + '"'))
    }

    var payload
    try {
      payload = command.encode(chunk.payload || {})
    } catch (err) {
      return cb(err)
    }

    payload = payload.slice(0, command.encode.bytes)
    chunk.length = command.encode.bytes
    chunk.checksum = getChecksum(payload)
    chunk.magic = chunk.magic == null ? opts.magic : chunk.magic
    if (chunk.magic == null) {
      throw new Error('Must specify network magic value in stream options or in message object')
    }
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
