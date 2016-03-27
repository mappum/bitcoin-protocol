var stream = require('./lib/stream')

module.exports = {
  createDecodeStream: stream.createDecodeStream,
  decode: stream.createDecodeStream,
  createEncodeStream: stream.createEncodeStream,
  encode: stream.createEncodeStream,
  dataTypes: require('./lib/dataTypes'),
  messages: require('./lib/messages'),
  constants: require('./lib/constants')
}
