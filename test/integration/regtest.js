'use strict'

var test = require('tap').test
var path = require('path')
var tmp = require('tmp')
var fs = require('fs')
var spawn = require('child_process').spawn
var RPCClient = require('bitcoin').Client
var net = require('net')
var bitcoinjs = require('bitcoinjs-lib')
var randomBytes = require('crypto').randomBytes
var bp = require('../../')

var REGTEST_MAGIC = require('coininfo').bitcoin.regtest.protocol.magic

function validateHeader (t, found, wanted) {
  t.equal(found.version, wanted.version)
  t.equal(new Buffer(found.prevHash).reverse().toString('hex'), wanted.previousblockhash)
  t.equal(new Buffer(found.merkleRoot).reverse().toString('hex'), wanted.merkleroot)
  t.equal(found.timestamp, wanted.time)
  t.equal(found.bits, parseInt(wanted.bits, 16))
  t.equal(found.nonce, wanted.nonce)
  t.equal(found.numTransactions, 0)
}

function validateBlock (t, found, wanted) {
  t.equal(found.version, wanted.version)
  t.equal(found.prevHash.toString('hex'), wanted.prevHash.toString('hex'))
  t.equal(found.merkleRoot.toString('hex'), wanted.merkleRoot.toString('hex'))
  t.equal(found.timestamp, wanted.timestamp)
  t.equal(found.bits, wanted.bits)
  t.equal(found.nonce, wanted.nonce)
  t.equal(found.transactions.length, wanted.transactions.length)
  for (var i = 0; i < found.transactions.length; ++i) {
    t.equal(found.transactions[i].version, wanted.transactions[i].version)
    t.equal(found.transactions[i].locktime, wanted.transactions[i].locktime)
    t.equal(found.transactions[i].ins.length, wanted.transactions[i].ins.length)
    for (var ij = 0; ij < found.transactions[i].ins.length; ++ij) {
      t.equal(found.transactions[i].ins[ij].hash.toString('hex'), wanted.transactions[i].ins[ij].hash.toString('hex'))
      t.equal(found.transactions[i].ins[ij].index, wanted.transactions[i].ins[ij].index)
      t.equal(found.transactions[i].ins[ij].script.toString('hex'), wanted.transactions[i].ins[ij].script.toString('hex'))
      t.equal(found.transactions[i].ins[ij].sequence, wanted.transactions[i].ins[ij].sequence)
    }
    t.equal(found.transactions[i].outs.length, wanted.transactions[i].outs.length)
    for (var oj = 0; oj < found.transactions[i].outs.length; ++oj) {
      // https://github.com/mappum/bitcoin-protocol/issues/10
      // t.equal(found.transactions[i].outs[oj].value, wanted.transactions[i].outs[oj].value)
      t.equal(found.transactions[i].outs[oj].script.toString('hex'), wanted.transactions[i].outs[oj].script.toString('hex'))
    }
  }
}

test('Integration with bitcoin core in regtest mode', function (t) {
  var bitcoindCommand = process.env.BITCOIND
  if (!fs.existsSync(bitcoindCommand)) throw new Error('Please set path to bitcoind in BITCOIND')

  var bitcoindPort = 10000 + Math.floor(Math.random() * 40000)
  var bitcoindRPCPort = 10000 + Math.floor(Math.random() * 40000)
  var bitcoind
  var rpc
  var socket

  t.test('spawn process', function (t) {
    tmp.setGracefulCleanup()
    var datadir = tmp.dirSync({
      prefix: 'bitcoin-protocol-regtest-',
      keep: false,
      unsafeCleanup: true
    }).name

    bitcoind = spawn(bitcoindCommand, [
      '-regtest',
      '-server',
      '-datadir=' + datadir,
      '-port=' + bitcoindPort,
      '-rpcport=' + bitcoindRPCPort,
      '-rpcuser=user',
      '-rpcpassword=pass',
      '-printtoconsole'
    ], { stdio: ['ignore', 'pipe', 'pipe'] })
    bitcoind.on('error', (err) => { console.log('Bitcoind error: ' + err.stack) })
    bitcoind.on('exit', (code, signal) => { console.log('Bitcoind exit: with code ' + code + ' on signal ' + signal) })
    // bitcoind.stdout.on('data', (data) => { console.log(data.toString()) })
    bitcoind.stderr.on('data', (data) => { process.stdout.write(data.toString()) })
    process.on('exit', function () {
      if (bitcoind) bitcoind.kill('SIGTERM')
    })

    rpc = new RPCClient({
      host: 'localhost',
      port: bitcoindRPCPort,
      user: 'user',
      pass: 'pass'
    })

    setTimeout(function () {
      rpc.generate(2, function (err) {
        t.equal(err, null)
        t.end()
      })
    }, 2500)
  })

  t.beforeEach(function (done) {
    socket = net.connect(bitcoindPort, '127.0.0.1')

    socket.decoder = bp.createDecodeStream({ magic: REGTEST_MAGIC })
    socket.pipe(socket.decoder)

    socket.encoder = bp.createEncodeStream({ magic: REGTEST_MAGIC })
    socket.encoder.pipe(socket)

    done()
  })

  t.afterEach(function (done) {
    if (socket) {
      socket.destroy()
      socket.decoder.removeAllListeners()
    }

    done()
  })

  function pingHandler (msg) {
    if (!msg || msg.command !== 'ping') return
    socket.encoder.write({
      command: 'pong',
      payload: {
        nonce: msg.payload.nonce
      }
    })
  }

  function connect (next) {
    return function (t) {
      var versionMsg = {
        command: 'version',
        payload: {
          version: 70000,
          services: new Buffer('0100000000000000', 'hex'),
          timestamp: Math.round(Date.now() / 1000),
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
          nonce: randomBytes(8),
          userAgent: '',
          startHeight: 0,
          relay: false
        }
      }
      socket.encoder.write(versionMsg)

      var waitVersionMsg = true
      function msgHandler (msg) {
        t.ok(msg, 'got data')
        t.equal(msg.magic, REGTEST_MAGIC)

        if (waitVersionMsg) {
          t.equal(msg.command, 'version', 'correct command')
          t.ok(msg.payload.version >= versionMsg.payload.version, 'correct version')
          t.same(msg.payload.services, versionMsg.payload.services, 'correct services')
          t.ok(msg.payload.timestamp - versionMsg.payload.timestamp < 5, 'correct timestamp')
          // t.equal(msg.payload.startHeight, 0, 'correct startHeight')
          waitVersionMsg = false
        } else {
          t.equal(msg.command, 'verack', 'correct command')
          t.same(msg.payload, {}, 'correct payload')
          socket.decoder.removeListener('data', msgHandler)
          socket.decoder.on('data', pingHandler)
          next(t)
        }
      }

      socket.decoder.on('data', msgHandler)
    }
  }

  t.test('handshake', function (t) {
    connect(function (t) { t.end() })(t)
  })

  t.test('send ping -> wait pong', connect(function (t) {
    var nonce = randomBytes(8)

    function msgHandler (msg) {
      if (msg.command !== 'pong') return
      t.ok(msg.payload.nonce)
      t.equal(msg.payload.nonce.toString('hex'), nonce.toString('hex'))
      t.end()
    }

    socket.decoder.on('data', msgHandler)
    socket.encoder.write({
      command: 'ping',
      payload: {
        nonce: nonce
      }
    })
  }))

  t.test('wait inv -> send getdata -> wait block', connect(function (t) {
    var context = { state: 0 }
    function msgHandler (msg) {
      switch (context.state) {
        case 1:
          if (msg.command !== 'inv') return
          t.ok(Array.isArray(msg.payload))
          t.equal(msg.payload.length, 1)
          t.equal(msg.payload[0].type, 2) // MSG_BLOCK
          t.equal(msg.payload[0].hash.toString('hex'), new Buffer(context.blockId, 'hex').reverse().toString('hex'))

          context.state = 2
          socket.encoder.write({
            command: 'getdata',
            payload: msg.payload
          })
          return
        case 2:
          if (msg.command !== 'block') return
          rpc.getBlock(context.blockId, false, function (err, blockHex) {
            t.equal(err, null)
            validateBlock(t, msg.payload, bitcoinjs.Block.fromBuffer(new Buffer(blockHex, 'hex')))
            t.end()
          })
          return
        default:
          return
      }
    }

    socket.decoder.on('data', msgHandler)

    rpc.generate(1, function (err, data) {
      t.equal(err, null)
      t.ok(Array.isArray(data))
      t.equal(data.length, 1)

      context.state = 1
      context.blockId = data[0]
    })
  }))

  t.test('send inv -> wait getdata -> send notfound', connect(function (t) {
    // TODO ?
    t.end()
  }))

  t.test('send getheaders -> wait headers', connect(function (t) {
    function msgHandler (msg) {
      if (msg.command !== 'headers') return
      t.ok(Array.isArray(msg.payload))
      ;(function next (i) {
        if (i >= msg.payload.length) return t.end()

        function handleBlock (err, block) {
          t.equal(err, null)
          validateHeader(t, msg.payload[i], block)
          next(i + 1)
        }

        function handleBlockHash (err, hash) {
          t.equal(err, null)
          rpc.getBlock(hash, handleBlock)
        }

        rpc.getBlockHash(i + 1, handleBlockHash)
      })(0)
    }

    socket.decoder.on('data', msgHandler)
    socket.encoder.write({
      command: 'getheaders',
      payload: {
        version: 70000,
        locator: [new Buffer(32).fill(0)],
        hashStop: new Buffer(32).fill(0)
      }
    })
  }))

  t.test('send getblocks -> wait blocks', connect(function (t) {
    var context = { state: 0 }
    function msgHandler (msg) {
      switch (context.state) {
        case 0:
          if (msg.command !== 'inv') return
          t.ok(Array.isArray(msg.payload))

          var i = 0
          context.next = function () {
            if (i >= msg.payload.length) return t.end()

            t.equal(msg.payload[i].type, 2) // MSG_BLOCK
            t.equal(msg.payload[i].hash.length, 32)

            context.blockId = new Buffer(msg.payload[i].hash).reverse().toString('hex')
            socket.encoder.write({
              command: 'getdata',
              payload: [ msg.payload[i] ]
            })

            i += 1
          }

          context.state = 1
          context.next()
          return
        case 1:
          if (msg.command !== 'block') return
          rpc.getBlock(context.blockId, false, function (err, blockHex) {
            t.equal(err, null)
            validateBlock(t, msg.payload, bitcoinjs.Block.fromBuffer(new Buffer(blockHex, 'hex')))
            context.next()
          })
          return
        default:
          return
      }
    }

    socket.decoder.on('data', msgHandler)
    socket.encoder.write({
      command: 'getblocks',
      payload: {
        version: 70000,
        locator: [new Buffer(32).fill(0)],
        hashStop: new Buffer(32).fill(0)
      }
    })
  }))

  t.test('kill bitcoind process', function (t) {
    if (bitcoind) bitcoind.kill('SIGTERM')
    t.end()
  })

  t.end()
})
