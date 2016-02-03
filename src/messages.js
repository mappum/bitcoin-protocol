const vstruct = require('varstruct')

exports.ping = vstruct({ nonce: vstruct.buffer(4) })
exports.pong = exports.ping
