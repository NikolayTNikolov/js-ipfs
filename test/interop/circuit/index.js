/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
const parallel = require('async/parallel')
const series = require('async/series')
const Factory = require('../../utils/ipfs-factory-daemon')
const bl = require('bl')
const waterfall = require('async/waterfall')

const crypto = require('crypto')
const setupJsNode = require('./utils').setupJsNode
const setupGoNode = require('./utils').setupGoNode

const multiaddr = require('multiaddr')

chai.use(dirtyChai)

const factory = new Factory()
describe('circuit interop', function () {
  let jsTCP
  let jsTCPAddrs
  let jsWS
  let jsWSAddrs
  let jsRelayAddrs

  let goRelayAddrs
  let goRelayDaemon

  let goTCPAddrs
  let goTCPDaemon
  let goTCP

  let goWSAddrs
  let goWSDaemon
  let goWS

  beforeEach((done) => {
    parallel([
      (pCb) => setupJsNode([
        '/ip4/127.0.0.1/tcp/61454/ws',
        '/ip4/127.0.0.1/tcp/61453'
      ], factory, true, pCb),
      (pCb) => setupJsNode([
        '/ip4/127.0.0.1/tcp/9002'
      ], factory, pCb),
      (pCb) => setupJsNode([
        '/ip4/127.0.0.1/tcp/9003/ws'
      ], factory, pCb),
      (pCb) => setupGoNode([
        '/ip4/0.0.0.0/tcp/0/ws',
        '/ip4/0.0.0.0/tcp/0'
      ], true, pCb),
      (pCb) => setupGoNode([
        '/ip4/0.0.0.0/tcp/0'
      ], pCb),
      (pCb) => setupGoNode([
        '/ip4/0.0.0.0/tcp/0/ws'
      ], pCb)
    ], (err, res) => {
      expect(err).to.not.exist()

      jsRelayAddrs = res[0][1].map((a) => a.toString()).filter((a) => !a.includes('/p2p-circuit'))
      jsTCP = res[1][0]
      jsTCPAddrs = res[1][1].map((a) => a.toString()).filter((a) => a.includes('/p2p-circuit'))
      jsWS = res[2][0]
      jsWSAddrs = res[2][1].map((a) => a.toString()).filter((a) => a.includes('/p2p-circuit'))

      goRelayDaemon = res[3][0]
      goRelayAddrs = res[3][1]
      goTCP = res[4][0].api
      goTCPDaemon = res[4][0]
      goTCPAddrs = res[4][1]
      goWS = res[5][0].api
      goWSDaemon = res[5][0]
      goWSAddrs = res[5][1]
      done()
    })
  })

  afterEach((done) => {
    parallel([
      (cb) => factory.dismantle(cb),
      (cb) => goRelayDaemon.stop(cb),
      (cb) => goTCPDaemon.stop(cb),
      (cb) => goWSDaemon.stop(cb)
    ], done)
  })

  it('jsWS <-> jsRelay <-> jsTCP', (done) => {
    const data = crypto.randomBytes(128)
    series([
      (cb) => jsWS.swarm.connect(jsRelayAddrs[0], cb),
      (cb) => jsTCP.swarm.connect(jsRelayAddrs[1], cb),
      (cb) => setTimeout(cb, 1000),
      (cb) => jsTCP.swarm.connect(jsWSAddrs[0], cb)
    ], (err) => {
      expect(err).to.not.exist()
      waterfall([
        (cb) => jsTCP.files.add(data, cb),
        (res, cb) => jsWS.files.cat(res[0].hash, cb),
        (stream, cb) => stream.pipe(bl(cb))
      ], done)
    })
  })

  it('goWS <-> jsRelay <-> goTCP', (done) => {
    const data = crypto.randomBytes(128)
    series([
      (cb) => goWS.swarm.connect(jsRelayAddrs[0], cb),
      (cb) => goTCP.swarm.connect(jsRelayAddrs[1], cb),
      (cb) => setTimeout(cb, 1000),
      (cb) => goTCP.swarm.connect(`/p2p-circuit/ipfs/${multiaddr(goWSAddrs[0]).getPeerId()}`, cb)
    ], (err) => {
      expect(err).to.not.exist()
      waterfall([
        (cb) => goTCP.files.add(data, cb),
        (res, cb) => goWS.files.cat(res[0].hash, cb),
        (stream, cb) => stream.pipe(bl(cb))
      ], done)
    })
  })

  it('jsWS <-> jsRelay <-> goTCP', (done) => {
    const data = crypto.randomBytes(128)
    series([
      (cb) => jsWS.swarm.connect(jsRelayAddrs[0], cb),
      (cb) => goTCP.swarm.connect(jsRelayAddrs[1], cb),
      (cb) => setTimeout(cb, 1000),
      (cb) => goTCP.swarm.connect(jsWSAddrs[0], cb)
    ], (err) => {
      expect(err).to.not.exist()
      waterfall([
        (cb) => goTCP.files.add(data, cb),
        (res, cb) => jsWS.files.cat(res[0].hash, cb),
        (stream, cb) => stream.pipe(bl(cb))
      ], done)
    })
  })

  it('jsTCP <-> goRelay <-> jsWS', (done) => {
    const data = crypto.randomBytes(128)
    series([
      (cb) => jsTCP.swarm.connect(goRelayAddrs[2], cb),
      (cb) => jsWS.swarm.connect(goRelayAddrs[0], cb),
      (cb) => setTimeout(cb, 1000),
      (cb) => jsWS.swarm.connect(jsTCPAddrs[0], cb)
    ], (err) => {
      expect(err).to.not.exist()
      waterfall([
        (cb) => jsTCP.files.add(data, cb),
        (res, cb) => jsWS.files.cat(res[0].hash, cb),
        (stream, cb) => stream.pipe(bl(cb))
      ], done)
    })
  })

  it('goTCP <-> goRelay <-> goWS', (done) => {
    const data = crypto.randomBytes(128)
    series([
      (cb) => goWS.swarm.connect(goRelayAddrs[0], cb),
      (cb) => goTCP.swarm.connect(goRelayAddrs[2], cb),
      (cb) => setTimeout(cb, 1000),
      (cb) => goWS.swarm.connect(`/p2p-circuit/ipfs/${multiaddr(goTCPAddrs[0]).getPeerId()}`, cb)
    ], (err) => {
      expect(err).to.not.exist()
      waterfall([
        (cb) => goTCP.files.add(data, cb),
        (res, cb) => goWS.files.cat(res[0].hash, cb),
        (stream, cb) => stream.pipe(bl(cb))
      ], done)
    })
  })

  it('jsWS <-> goRelay <-> goTCP', (done) => {
    const data = crypto.randomBytes(128)
    series([
      (cb) => jsWS.swarm.connect(goRelayAddrs[0], cb),
      (cb) => goTCP.swarm.connect(goRelayAddrs[2], cb),
      (cb) => setTimeout(cb, 1000),
      (cb) => goTCP.swarm.connect(`/p2p-circuit/ipfs/${multiaddr(jsWSAddrs[0]).getPeerId()}`, cb)
    ], (err) => {
      expect(err).to.not.exist()
      waterfall([
        (cb) => goTCP.files.add(data, cb),
        (res, cb) => jsWS.files.cat(res[0].hash, cb),
        (stream, cb) => stream.pipe(bl(cb))
      ], done)
    })
  })
})
