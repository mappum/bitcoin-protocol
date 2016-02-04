const test = require('tap').test
const bp = require('../')

test('decode stream', t => {
  t.test('simple decode', t => {
    const stream = bp.createDecodeStream()

    t.test('version', t => {
      stream.once('data', message => {
        t.ok(message, 'got data')
        t.equal(message.magic, 3652501241, 'correct magic')
        t.equal(message.command, 'version', 'correct command')
        t.equal(message.length, 86, 'correct length')
        t.ok(message.checksum.compare(new Buffer('d33fa729', 'hex')) === 0, 'correct checksum')
        t.equal(message.payload.version, 31900, 'correct version')
        t.ok(message.payload.services.compare(new Buffer('0100000000000000', 'hex')) === 0, 'correct services')
        t.equal(message.payload.timestamp, 1292899814, 'correct timestamp')
        t.ok(message.payload.receiverAddress.services.compare(new Buffer('0100000000000000', 'hex')) === 0, 'correct receiver address services')
        t.equal(message.payload.receiverAddress.address, '10.0.0.1', 'correct receiver address IP')
        t.equal(message.payload.receiverAddress.port, 8333, 'correct receiver address port')
        t.ok(message.payload.senderAddress.services.compare(new Buffer('0100000000000000', 'hex')) === 0, 'correct sender address services')
        t.equal(message.payload.senderAddress.address, '10.0.0.2', 'correct sender address IP')
        t.equal(message.payload.senderAddress.port, 8333, 'correct sender address port')
        t.ok(message.payload.nonce.compare(new Buffer('dd9d202c3ab45713', 'hex')) === 0, 'correct nonce')
        t.equal(message.payload.userAgent, '', 'correct userAgent')
        t.equal(message.payload.startHeight, 98645, 'correct startHeight')
        t.equal(message.payload.relay, false, 'correct relay')
        t.end()
      })
      stream.write(new Buffer('F9BEB4D976657273696F6E000000000056000000d33fa7299C7C00000100000000000000E615104D00000000010000000000000000000000000000000000FFFF0A000001208D010000000000000000000000000000000000FFFF0A000002208DDD9D202C3AB45713005581010000', 'hex'))
    })

    t.test('verack', t => {
      stream.once('data', message => {
        t.ok(message, 'got data')
        t.equal(message.magic, 3652501241, 'correct magic')
        t.equal(message.command, 'verack', 'correct command')
        t.equal(message.length, 0, 'correct length')
        t.end()
      })
      stream.write(new Buffer('F9BEB4D976657261636B000000000000000000005DF6E0E2', 'hex'))
    })

    t.test('addr', t => {
      stream.once('data', message => {
        t.ok(message, 'got data')
        t.equal(message.magic, 3652501241, 'correct magic')
        t.equal(message.command, 'addr', 'correct command')
        t.equal(message.length, 31, 'correct length')
        t.ok(Array.isArray(message.payload), 'payload is an array')
        t.equal(message.payload.length, 1, 'payload is correct length')
        t.equal(message.payload[0].time, 1292899810, 'correct time')
        t.ok(message.payload[0].services.compare(new Buffer('0100000000000000', 'hex')) === 0, 'correct services')
        t.equal(message.payload[0].address, '10.0.0.1', 'correct IP')
        t.equal(message.payload[0].port, 8333, 'correct port')
        t.end()
      })
      stream.write(new Buffer('F9BEB4D96164647200000000000000001F000000ED52399B01E215104D010000000000000000000000000000000000FFFF0A000001208D', 'hex'))
    })

    t.test('tx', t => {
      stream.once('data', message => {
        t.ok(message, 'got data')
        t.equal(message.magic, 3652501241, 'correct magic')
        t.equal(message.command, 'tx', 'correct command')
        t.equal(message.length, 258, 'correct length')
        t.equal(message.payload.version, 1, 'correct version')
        t.ok(Array.isArray(message.payload.in), 'in is an array')
        t.equal(message.payload.in.length, 1, 'correct in length')
        t.ok(message.payload.in[0].prevOut.txid.compare(new Buffer('6dbddb085b1d8af75184f0bc01fad58d1266e9b63b50881990e4b40d6aee3629', 'hex')) === 0, 'correct prevOut txid')
        t.equal(message.payload.in[0].prevOut.index, 0, 'correct prevOut index')
        t.ok(message.payload.in[0].scriptSig.compare(new Buffer('483045022100f3581e1972ae8ac7c7367a7a253bc1135223adb9a468bb3a59233f45bc578380022059af01ca17d00e41837a1d58e97aa31bae584edec28d35bd96923690913bae9a0141049c02bfc97ef236ce6d8fe5d94013c721e915982acd2b12b65d9b7d59e20a842005f8fc4e02532e873d37b96f09d6d4511ada8f14042f46614a4c70c0f14beff5', 'hex')) === 0, 'correct prevOut index')
        t.equal(message.payload.in[0].sequence, 4294967295, 'correct in sequence')
        t.ok(Array.isArray(message.payload.out), 'out is an array')
        t.equal(message.payload.out.length, 2, 'correct out length')
        t.equal(message.payload.out[0].value.toString(), '5000000', 'correct out value')
        t.equal(message.payload.out[0].scriptPubKey.toString('hex'), '76a9141aa0cd1cbea6e7458a7abad512a9d9ea1afb225e88ac', 'correct scriptPubKey')
        t.equal(message.payload.out[1].value.toString(), '3354000000', 'correct out value')
        t.equal(message.payload.out[1].scriptPubKey.toString('hex'), '76a9140eab5bea436a0484cfab12485efda0b78b4ecc5288ac', 'correct scriptPubKey')
        t.equal(message.payload.lockTime, 0, 'correct lockTime')
        t.end()
      })
      stream.write(new Buffer('F9BEB4D974780000000000000000000002010000E293CDBE01000000016DBDDB085B1D8AF75184F0BC01FAD58D1266E9B63B50881990E4B40D6AEE3629000000008B483045022100F3581E1972AE8AC7C7367A7A253BC1135223ADB9A468BB3A59233F45BC578380022059AF01CA17D00E41837A1D58E97AA31BAE584EDEC28D35BD96923690913BAE9A0141049C02BFC97EF236CE6D8FE5D94013C721E915982ACD2B12B65D9B7D59E20A842005F8FC4E02532E873D37B96F09D6D4511ADA8F14042F46614A4C70C0F14BEFF5FFFFFFFF02404B4C00000000001976A9141AA0CD1CBEA6E7458A7ABAD512A9D9EA1AFB225E88AC80FAE9C7000000001976A9140EAB5BEA436A0484CFAB12485EFDA0B78B4ECC5288AC00000000', 'hex'))
    })

    t.end()
  })

  t.test('decode errors', t => {
    t.test('invalid magic', t => {
      const stream = bp.createDecodeStream({ magic: 3652501241 })
      stream.once('error', err => {
        t.ok(err, 'got error')
        t.equal(err.message, 'Magic value in message (ffffffff) did not match expected (d9b4bef9)', 'correct error message')
        t.end()
      })
      stream.write(new Buffer('FFFFFFFF76657261636B000000000000000000005DF6E0E2', 'hex'))
    })

    t.test('invalid string padding', t => {
      const stream = bp.createDecodeStream()
      stream.once('error', err => {
        t.ok(err, 'got error')
        t.equal(err.message, 'Found a non-null byte after the first null byte in a null-padded string', 'correct error message')
        t.end()
      })
      stream.write(new Buffer('F9BEB4D976657261636B00FF00000000000000005DF6E0E2', 'hex'))
    })

    t.test('invalid command', t => {
      const stream = bp.createDecodeStream()
      stream.once('error', err => {
        t.ok(err, 'got error')
        t.equal(err.message, 'Unrecognized command: "abcd"', 'correct error message')
        t.end()
      })
      stream.write(new Buffer('F9BEB4D9616263640000000000000000000000005DF6E0E2', 'hex'))
    })

    t.test('invalid checksum', t => {
      const stream = bp.createDecodeStream()
      stream.once('error', err => {
        t.ok(err, 'got error')
        t.equal(err.message, 'Invalid message checksum. In header: "ffffffff", calculated: "137ad663"', 'correct error message')
        t.end()
      })
      stream.write(new Buffer('f9beb4d970696e67000000000000000008000000ffffffff0123456789abcdef', 'hex'))
    })

    t.end()
  })

  t.test('buffering', t => {
    const stream = bp.createDecodeStream()
    const data = new Buffer('f9beb4d970696e67000000000000000008000000137ad663', 'hex')
    stream.once('data', message => {
      t.ok(message, 'got data')
      t.equal(message.magic, 3652501241, 'correct magic')
      t.equal(message.command, 'ping', 'correct command')
      t.equal(message.length, 8, 'correct length')
      t.equal(message.payload.nonce.toString('hex'), '0123456789abcdef', 'correct nonce')
      t.end()
    })
    for (var i = 0; i < data.length; i++) {
      stream.write(data.slice(i, i + 1))
    }
    t.end()
  })

  t.end()
})
