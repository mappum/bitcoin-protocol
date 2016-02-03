var stream = require('./src/stream.js')

module.exports = {
  createDecodeStream: stream.createDecodeStream,
  createEncodeStream: stream.createEncodeStream,
  dataTypes: require('./src/dataTypes.js'),
  messages: require('./src/messages.js')
}
