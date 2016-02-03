const vstruct = require('varstruct')
const dataTypes = require('./dataTypes.js')

exports.ping = vstruct({ nonce: dataTypes.buffer(8) })
exports.pong = exports.ping
