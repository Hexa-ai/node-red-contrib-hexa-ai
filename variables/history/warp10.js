const bus = require('../../bus')

module.exports = function (RED) {
  RED.nodes.registerType("history-warp10", function (config) {
    RED.nodes.createNode(this, config)
    const node = this

    let buffer = {}
    let bufferSize = 0

    node.status({ fill: "grey", shape: "dot", text: "Buffer size : " + bufferSize })
    const pushed = function (entry) {
      if (!(entry.name in buffer)) {
        buffer[entry.name] = {
          origin: entry.config,
          values: []
        }
      }

      buffer[entry.name].values.push([entry.ts, entry.value])
      bufferSize++

      node.status({ fill: "green", shape: "dot", text: "Buffer size : " + bufferSize })
    }

    const interval = setInterval(function () {
      if (bufferSize > 0) {
        node.status({ fill: "green", shape: "ring", text: "Buffer size : " + bufferSize })
        console.log(buffer)

        // wap10 = RED.nodes.getNode(config.warp10);
        // buffer = {}
        // bufferSize = 0

        setTimeout(() => {
          node.status({ fill: "grey", shape: "dot", text: "Buffer size : " + bufferSize })
        }, 200)
      }
    }, config.interval_ms || 1000)

    // Watch events
    bus.on('history-buffer:push', pushed)

    // Unwatch events and stop interval on node close
    node.on('close', function () {
      bus.removeListener('history-buffer:push', pushed)
      clearTimeout(interval)
    })
  })
}