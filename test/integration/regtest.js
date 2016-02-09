'use strict'

var test = require('tap').test
var path = require('path')
var tmp = require('tmp')
var fs = require('fs')
var spawn = require('child_process').spawn
var net = require('net')
var randomBytes = require('crypto').randomBytes
var bp = require('../../')

var REGTEST_MAGIC = require('coininfo').bitcoin.regtest.protocol.magic

test('Integration with bitcoin core in regtest mode', function (t) {
  var bitcoindCommand = process.env.BITCOIND
  if (!fs.existsSync(bitcoindCommand)) throw new Error('Please set path to bitcoind in BITCOIND')

  var bitcoindPort = 10000 + Math.floor(Math.random() * 40000)
  var bitcoindRPCPort = 10000 + Math.floor(Math.random() * 40000)
  var bitcoind
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

    setTimeout(function () { t.end() }, 2500)
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

  function connect (t, cb) {
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
        t.equal(msg.payload.startHeight, 0, 'correct startHeight')
        waitVersionMsg = false
      } else {
        t.equal(msg.command, 'verack', 'correct command')
        t.same(msg.payload, {}, 'correct payload')
        socket.decoder.removeListener('data', msgHandler)
        socket.decoder.on('data', pingHandler)
        cb()
      }
    }

    socket.decoder.on('data', msgHandler)
  }

  t.test('handshake', function (t) {
    connect(t, function () {
      t.end()
    })
  })

  t.test('kill bitcoind process', function (t) {
    if (bitcoind) bitcoind.kill('SIGTERM')
    t.end()
  })

  t.end()
})
