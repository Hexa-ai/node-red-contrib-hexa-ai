const bus = require('../bus')

module.exports = function (RED) {
  RED.nodes.registerType("on-alarm", function (config) {
    RED.nodes.createNode(this, config)
    const node = this

    // Send to the output 1 the alarm when triggered
    const triggered = function (entry) {
      node.send([{ payload: entry.value, topic: entry.name, origin: entry }, null])
    }

    // Send to the output 2 the alarm when ended
    const ended = function (entry) {
      node.send([null, { payload: entry.value, topic: entry.name, origin: entry }])
    }

    // Watch events
    bus.on('alarm-triggered', triggered)
    bus.on('alarm-ended', ended)

    // Unwatch events on node close
    node.on('close', function () {
      bus.removeListener('alarm-triggered', triggered)
      bus.removeListener('alarm-ended', ended)
    })
  })
}