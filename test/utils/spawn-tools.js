'use strict'

const createTempRepo = require('./create-repo-nodejs.js')
const HTTPAPI = require('../../src/http')
const GoDaemon = require('../interop/daemons/go')
const series = require('async/series')

let nodes = []

/*
 * spawns a daemon with ports numbers starting in 10 and ending in `num`
 */
function spawnNodeDaemon (addrs, api, gateway, callback) {
  const config = {
    Addresses: {
      Swarm: addrs,
      API: `/ip4/127.0.0.1/tcp/${api}`,
      Gateway: `/ip4/127.0.0.1/tcp/${gateway}`
    },
    Bootstrap: [],
    Discovery: {
      MDNS: {
        Enabled: false
      },
      webRTCStar: {
        Enabled: false
      }
    },
    API: {
      HTTPHeaders: {
        'Access-Control-Allow-Headers': [
          'X-Requested-With',
          'Range'
        ],
        'Access-Control-Allow-Methods': [
          'GET'
        ],
        'Access-Control-Allow-Origin': [
          '*'
        ]
      }
    },
    EXPERIMENTAL: {
      Relay: {
        Enabled: true,
        HOP: {
          Enabled: true,
          Active: true
        }
      }
    }
  }

  const daemon = new HTTPAPI(createTempRepo(), config)
  nodes.push(daemon)
  daemon.start(true, callback)
}

function spawnGoNode (addrs, api, gateway, cb) {
  const daemon = new GoDaemon({
    disposable: true,
    init: true,
    config: {
      Addresses: {
        Swarm: addrs,
        API: `/ip4/127.0.0.1/tcp/${api}`,
        Gateway: `/ip4/0.0.0.0/tcp/${gateway}`
      },
      API: {
        HTTPHeaders: {
          'Access-Control-Allow-Headers': [
            'X-Requested-With',
            'Range'
          ],
          'Access-Control-Allow-Methods': [
            'GET'
          ],
          'Access-Control-Allow-Origin': [
            '*'
          ]
        }
      },
      Swarm: {
        AddrFilters: null,
        DisableBandwidthMetrics: false,
        DisableNatPortMap: false,
        DisableRelay: false,
        EnableRelayHop: true
      }
    }
  })

  daemon.start((err) => {
    if (err) throw err
    nodes.push(daemon)
    cb()
  })
}

function stopNodes (callback) {
  series(nodes.map((node) => (cb) => {
    setTimeout(() => node.stop(cb), 100)
  }), callback)
}

module.exports = {
  spawnNodeDaemon,
  spawnGoNode,
  stopNodes
}
