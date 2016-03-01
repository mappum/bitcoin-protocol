var stream = require('./lib/stream.js')

module.exports = {
  createDecodeStream: stream.createDecodeStream,
  decode: stream.createDecodeStream,
  createEncodeStream: stream.createEncodeStream,
  encode: stream.createEncodeStream,
  dataTypes: require('./lib/dataTypes.js'),
  messages: require('./lib/messages.js'),
  constants: require('./lib/constants.js')
}
