const through = require('through2')
const vstruct = require('varstruct')
const dataTypes = require('./dataTypes.js')
const messages = require('./messages.js')

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
      chunk = chunk.slice(message.length)
      message.payload = command.decode(payload)
      this.push(message)
    }
    cb(null)
  })
}

module.exports = {
  createDecodeStream
}
