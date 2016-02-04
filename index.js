var stream = require('./lib/stream.js')

module.exports = {
  createDecodeStream: stream.createDecodeStream,
  createEncodeStream: stream.createEncodeStream,
  dataTypes: require('./lib/dataTypes.js'),
  messages: require('./lib/messages.js')
}
