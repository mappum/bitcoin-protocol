'use strict'
var test = require('tape').test
var StreamBuffer = require('stream-buffers').WritableStreamBuffer
var bp = require('../')

test('encode stream', function (t) {
  t.test('version', function (t) {
    var stream = bp.createEncodeStream({ magic: 3652501241 })
    var buf = stream.pipe(new StreamBuffer())
    stream.write({
      command: 'version',
      payload: {
        version: 31900,
        services: new Buffer('0100000000000000', 'hex'),
        timestamp: 1292899814,
        receiverAddress: {
          services: new Buffer('0100000000000000', 'hex'),
          address: '10.0.0.1',
          port: 8333
        },
        senderAddress: {
          services: new Buffer('0100000000000000', 'hex'),
          address: '10.0.0.2',
          port: 8333
        },
        nonce: new Buffer('dd9d202c3ab45713', 'hex'),
        userAgent: '',
        startHeight: 98645,
        relay: false
      }
    })
    t.same(buf.getContents().toString('hex'), 'f9beb4d976657273696f6e000000000056000000d33fa7299c7c00000100000000000000e615104d00000000010000000000000000000000000000000000ffff0a000001208d010000000000000000000000000000000000ffff0a000002208ddd9d202c3ab45713005581010000', 'correct bytes')
    t.end()
  })

  t.test('verack', function (t) {
    var stream = bp.createEncodeStream({ magic: 3652501241 })
    var buf = stream.pipe(new StreamBuffer())
    stream.write({ command: 'verack' })
    t.same(buf.getContents().toString('hex'), 'f9beb4d976657261636b000000000000000000005df6e0e2', 'correct bytes')
    t.end()
  })

  t.test('addr', function (t) {
    var stream = bp.createEncodeStream({ magic: 3652501241 })
    var buf = stream.pipe(new StreamBuffer())
    stream.write({
      command: 'addr',
      payload: [
        {
          time: 1292899810,
          services: new Buffer('0100000000000000', 'hex'),
          address: '10.0.0.1',
          port: 8333
        }
      ]
    })
    t.same(buf.getContents().toString('hex'), 'f9beb4d96164647200000000000000001f000000ed52399b01e215104d010000000000000000000000000000000000ffff0a000001208d', 'correct bytes')
    t.end()
  })

  t.test('tx', function (t) {
    var stream = bp.createEncodeStream({ magic: 3652501241 })
    var buf = stream.pipe(new StreamBuffer())
    stream.write({
      command: 'tx',
      payload: {
        version: 1,
        ins: [
          {
            hash: new Buffer('6dbddb085b1d8af75184f0bc01fad58d1266e9b63b50881990e4b40d6aee3629', 'hex'),
            index: 0,
            script: new Buffer('483045022100f3581e1972ae8ac7c7367a7a253bc1135223adb9a468bb3a59233f45bc578380022059af01ca17d00e41837a1d58e97aa31bae584edec28d35bd96923690913bae9a0141049c02bfc97ef236ce6d8fe5d94013c721e915982acd2b12b65d9b7d59e20a842005f8fc4e02532e873d37b96f09d6d4511ada8f14042f46614a4c70c0f14beff5', 'hex'),
            sequence: 4294967295
          }
        ],
        outs: [
          {
            valueBuffer: new Buffer('404b4c0000000000', 'hex'),
            script: new Buffer('76a9141aa0cd1cbea6e7458a7abad512a9d9ea1afb225e88ac', 'hex')
          },
          {
            valueBuffer: new Buffer('80fae9c700000000', 'hex'),
            script: new Buffer('76a9140eab5bea436a0484cfab12485efda0b78b4ecc5288ac', 'hex')
          }
        ],
        locktime: 0
      }
    })
    t.same(buf.getContents().toString('hex'), 'f9beb4d974780000000000000000000002010000e293cdbe01000000016dbddb085b1d8af75184f0bc01fad58d1266e9b63b50881990e4b40d6aee3629000000008b483045022100f3581e1972ae8ac7c7367a7a253bc1135223adb9a468bb3a59233f45bc578380022059af01ca17d00e41837a1d58e97aa31bae584edec28d35bd96923690913bae9a0141049c02bfc97ef236ce6d8fe5d94013c721e915982acd2b12b65d9b7d59e20a842005f8fc4e02532e873d37b96f09d6d4511ada8f14042f46614a4c70c0f14beff5ffffffff02404b4c00000000001976a9141aa0cd1cbea6e7458a7abad512a9d9ea1afb225e88ac80fae9c7000000001976a9140eab5bea436a0484cfab12485efda0b78b4ecc5288ac00000000', 'correct bytes')
    t.end()
  })

  t.end()
})
