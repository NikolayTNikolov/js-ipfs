/* eslint-env mocha */

'use strict'

const chai = require('chai')
const expect = chai.expect
const waterfall = require('async/waterfall')

const relayConfig = require('../../utils/ipfs-factory-daemon/default-config.json')
const GoDaemon = require('../daemons/go')

exports.setupGoNode = function setupGoNode (addrs, hop, cb) {
  if (typeof hop === 'function') {
    cb = hop
    hop = false
  }

  const daemon = new GoDaemon({
    disposable: true,
    init: true,
    config: {
      Addresses: {
        Swarm: addrs,
        API: `/ip4/0.0.0.0/tcp/0`,
        Gateway: `/ip4/0.0.0.0/tcp/0`
      },
      Swarm: {
        AddrFilters: null,
        DisableBandwidthMetrics: false,
        DisableNatPortMap: false,
        DisableRelay: false,
        EnableRelayHop: hop
      }
    }
  })

  daemon.start((err) => {
    expect(err).to.not.exist()
    daemon.api.id((err, id) => {
      expect(err).to.not.exist()
      cb(null, daemon, id.addresses)
    })
  })
}

exports.setupJsNode = function setupJsNode (addrs, factory, hop, cb) {
  let relayPeer
  let relayAddrs

  if (typeof hop === 'function') {
    cb = hop
    hop = false
  }

  cb = cb || (() => {})

  waterfall([
    (pCb) => {
      factory.spawnNode(null, Object.assign(relayConfig, {
        Addresses: {
          Swarm: addrs,
          API: `/ip4/0.0.0.0/tcp/0`,
          Gateway: `/ip4/0.0.0.0/tcp/0`
        },
        EXPERIMENTAL: {
          Relay: {
            Enabled: true,
            HOP: {
              Enabled: hop,
              Active: false
            }
          }
        }
      }), (err, node) => {
        expect(err).to.not.exist()
        relayPeer = node
        pCb()
      })
    },
    (pCb) => {
      relayPeer.swarm.localAddrs((err, addrs) => {
        expect(err).to.not.exist()
        relayAddrs = addrs
        pCb()
      })
    }], (err) => {
    expect(err).to.not.exist()
    cb(null, relayPeer, relayAddrs)
  })
}
