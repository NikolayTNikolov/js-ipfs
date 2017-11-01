'use strict'

const parallel = require('async/parallel')
const spawner = require('./test/utils/spawn-tools')

/*
 * spawns a daemon with ports numbers starting in 10 and ending in `num`
 */
let before = (done) => {
  parallel([
    (cb) => spawner.spawnNodeDaemon([
      `/ip4/127.0.0.1/tcp/10007`,
      `/ip4/127.0.0.1/tcp/20007/ws`
    ], 31007, 32007, cb),
    (cb) => spawner.spawnNodeDaemon([
      `/ip4/127.0.0.1/tcp/10008`,
      `/ip4/127.0.0.1/tcp/20008/ws`
    ], 31008, 32008, cb),
    (cb) => spawner.spawnNodeDaemon([
      `/ip4/127.0.0.1/tcp/10012`,
      `/ip4/127.0.0.1/tcp/20012/ws`
    ], 31012, 32012, cb),
    (cb) => spawner.spawnNodeDaemon([
      `/ip4/127.0.0.1/tcp/10013`,
      `/ip4/127.0.0.1/tcp/20013/ws`
    ], 31013, 32013, cb),
    (cb) => spawner.spawnGoNode([
      `/ip4/127.0.0.1/tcp/10027`,
      `/ip4/127.0.0.1/tcp/20027/ws`
    ], 33027, 44027, cb),
    (cb) => spawner.spawnGoNode([
      `/ip4/127.0.0.1/tcp/10028`,
      `/ip4/127.0.0.1/tcp/20028/ws`
    ], 33028, 44028, cb),
    (cb) => spawner.spawnGoNode([
      `/ip4/127.0.0.1/tcp/10031`,
      `/ip4/127.0.0.1/tcp/20031/ws`
    ], 33031, 44031, cb),
    (cb) => spawner.spawnGoNode([
      `/ip4/127.0.0.1/tcp/10032`,
      `/ip4/127.0.0.1/tcp/20032/ws`
    ], 33032, 44032, cb)
  ], done)
}

module.exports = {
  karma: {
    files: [{
      pattern: 'node_modules/interface-ipfs-core/test/fixtures/**/*',
      watched: false,
      served: true,
      included: false,
      singleRun: false
    }]
  },
  hooks: {
    pre: before,
    post: spawner.stopNodes
  }
}
