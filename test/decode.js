'use strict'
var test = require('tape').test
var bp = require('../')

test('decode stream', function (t) {
  t.test('decode version', function (t) {
    var stream = bp.createDecodeStream()
    stream.once('data', function (message) {
      t.true(message, 'got data')
      t.same(message.magic, 3652501241, 'correct magic')
      t.same(message.command, 'version', 'correct command')
      t.same(message.length, 86, 'correct length')
      t.same(message.checksum, new Buffer('d33fa729', 'hex'), 'correct checksum')
      t.same(message.payload.version, 31900, 'correct version')
      t.same(message.payload.services, new Buffer('0100000000000000', 'hex'), 'correct services')
      t.same(message.payload.timestamp, 1292899814, 'correct timestamp')
      t.same(message.payload.receiverAddress.services, new Buffer('0100000000000000', 'hex'), 'correct receiver address services')
      t.same(message.payload.receiverAddress.address, '10.0.0.1', 'correct receiver address IP')
      t.same(message.payload.receiverAddress.port, 8333, 'correct receiver address port')
      t.same(message.payload.senderAddress.services, new Buffer('0100000000000000', 'hex'), 'correct sender address services')
      t.same(message.payload.senderAddress.address, '10.0.0.2', 'correct sender address IP')
      t.same(message.payload.senderAddress.port, 8333, 'correct sender address port')
      t.same(message.payload.nonce, new Buffer('dd9d202c3ab45713', 'hex'), 'correct nonce')
      t.same(message.payload.userAgent, '', 'correct userAgent')
      t.same(message.payload.startHeight, 98645, 'correct startHeight')
      t.same(message.payload.relay, false, 'correct relay')
      t.end()
    })
    stream.write(new Buffer('f9beb4d976657273696f6e000000000056000000d33fa7299c7c00000100000000000000e615104d00000000010000000000000000000000000000000000ffff0a000001208d010000000000000000000000000000000000ffff0a000002208ddd9d202c3ab45713005581010000', 'hex'))
  })

  t.test('decode verack', function (t) {
    var stream = bp.createDecodeStream()
    stream.once('data', function (message) {
      t.true(message, 'got data')
      t.same(message.magic, 3652501241, 'correct magic')
      t.same(message.command, 'verack', 'correct command')
      t.same(message.length, 0, 'correct length')
      t.end()
    })
    stream.write(new Buffer('f9beb4d976657261636b000000000000000000005df6e0e2', 'hex'))
  })

  t.test('decode addr', function (t) {
    var stream = bp.createDecodeStream()
    stream.once('data', function (message) {
      t.true(message, 'got data')
      t.same(message.magic, 3652501241, 'correct magic')
      t.same(message.command, 'addr', 'correct command')
      t.same(message.length, 31, 'correct length')
      t.true(Array.isArray(message.payload), 'payload is an array')
      t.same(message.payload.length, 1, 'payload is correct length')
      t.same(message.payload[0].time, 1292899810, 'correct time')
      t.same(message.payload[0].services, new Buffer('0100000000000000', 'hex'), 'correct services')
      t.same(message.payload[0].address, '10.0.0.1', 'correct IP')
      t.same(message.payload[0].port, 8333, 'correct port')
      t.end()
    })
    stream.write(new Buffer('f9beb4d96164647200000000000000001f000000ed52399b01e215104d010000000000000000000000000000000000ffff0a000001208d', 'hex'))
  })

  t.test('decode tx', function (t) {
    var stream = bp.createDecodeStream()
    stream.once('data', function (message) {
      t.true(message, 'got data')
      t.same(message.magic, 3652501241, 'correct magic')
      t.same(message.command, 'tx', 'correct command')
      t.same(message.length, 258, 'correct length')
      t.same(message.payload.version, 1, 'correct version')
      t.true(Array.isArray(message.payload.ins), 'ins is an array')
      t.same(message.payload.ins.length, 1, 'correct ins length')
      t.same(message.payload.ins[0].hash, new Buffer('6dbddb085b1d8af75184f0bc01fad58d1266e9b63b50881990e4b40d6aee3629', 'hex'), 'correct input hash')
      t.same(message.payload.ins[0].index, 0, 'correct input index')
      t.same(message.payload.ins[0].script, new Buffer('483045022100f3581e1972ae8ac7c7367a7a253bc1135223adb9a468bb3a59233f45bc578380022059af01ca17d00e41837a1d58e97aa31bae584edec28d35bd96923690913bae9a0141049c02bfc97ef236ce6d8fe5d94013c721e915982acd2b12b65d9b7d59e20a842005f8fc4e02532e873d37b96f09d6d4511ada8f14042f46614a4c70c0f14beff5', 'hex'), 'correct input index')
      t.same(message.payload.ins[0].sequence, 4294967295, 'correct input sequence')
      t.true(Array.isArray(message.payload.outs), 'outs is an array')
      t.same(message.payload.outs.length, 2, 'correct outs length')
      t.same(message.payload.outs[0].valueBuffer.toString('hex'), '404b4c0000000000', 'correct outs value')
      t.same(message.payload.outs[0].script.toString('hex'), '76a9141aa0cd1cbea6e7458a7abad512a9d9ea1afb225e88ac', 'correct scriptPubKey')
      t.same(message.payload.outs[1].valueBuffer.toString('hex'), '80fae9c700000000', 'correct outs value')
      t.same(message.payload.outs[1].script.toString('hex'), '76a9140eab5bea436a0484cfab12485efda0b78b4ecc5288ac', 'correct scriptPubKey')
      t.same(message.payload.locktime, 0, 'correct locktime')
      t.end()
    })
    stream.write(new Buffer('f9beb4d974780000000000000000000002010000e293cdbe01000000016dbddb085b1d8af75184f0bc01fad58d1266e9b63b50881990e4b40d6aee3629000000008b483045022100f3581e1972ae8ac7c7367a7a253bc1135223adb9a468bb3a59233f45bc578380022059af01ca17d00e41837a1d58e97aa31bae584edec28d35bd96923690913bae9a0141049c02bfc97ef236ce6d8fe5d94013c721e915982acd2b12b65d9b7d59e20a842005f8fc4e02532e873d37b96f09d6d4511ada8f14042f46614a4c70c0f14beff5ffffffff02404b4c00000000001976a9141aa0cd1cbea6e7458a7abad512a9d9ea1afb225e88ac80fae9c7000000001976a9140eab5bea436a0484cfab12485efda0b78b4ecc5288ac00000000', 'hex'))
  })

  t.test('invalid magic', function (t) {
    var stream = bp.createDecodeStream({ magic: 3652501241 })
    stream.once('error', function (err) {
      t.true(err, 'got error')
      t.same(err.message, 'Magic value in message (ffffffff) did not match expected (d9b4bef9)', 'correct error message')
      t.end()
    })
    stream.write(new Buffer('ffffffff76657261636b000000000000000000005df6e0e2', 'hex'))
  })

  t.test('invalid string padding', function (t) {
    var stream = bp.createDecodeStream()
    stream.once('error', function (err) {
      t.true(err, 'got error')
      t.same(err.message, 'Found a non-null byte after the first null byte in a null-padded string', 'correct error message')
      t.end()
    })
    stream.write(new Buffer('f9beb4d976657261636b00ff00000000000000005df6e0e2', 'hex'))
  })

  t.test('invalid command', function (t) {
    var stream = bp.createDecodeStream()
    stream.once('error', function (err) {
      t.true(err, 'got error')
      t.same(err.message, 'Unrecognized command: "abcd"', 'correct error message')
      t.end()
    })
    stream.write(new Buffer('f9beb4d9616263640000000000000000000000005df6e0e2', 'hex'))
  })

  t.test('invalid checksum', function (t) {
    var stream = bp.createDecodeStream()
    stream.once('error', function (err) {
      t.true(err, 'got error')
      t.same(err.message, 'Invalid message checksum. In header: "ffffffff", calculated: "137ad663"', 'correct error message')
      t.end()
    })
    stream.write(new Buffer('f9beb4d970696e67000000000000000008000000ffffffff0123456789abcdef', 'hex'))
  })

  t.test('buffering', function (t) {
    var stream = bp.createDecodeStream()
    var data = new Buffer('f9beb4d970696e67000000000000000008000000137ad6630123456789abcdef', 'hex')
    stream.once('data', function (message) {
      t.true(message, 'got data')
      t.same(message.magic, 3652501241, 'correct magic')
      t.same(message.command, 'ping', 'correct command')
      t.same(message.length, 8, 'correct length')
      t.same(message.payload.nonce.toString('hex'), '0123456789abcdef', 'correct nonce')
      t.end()
    })
    for (var i = 0; i < data.length; ++i) {
      stream.write(data.slice(i, i + 1))
    }
  })

  t.end()
})
