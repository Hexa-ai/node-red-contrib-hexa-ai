const bus = require('../bus')

module.exports = function (RED) {
  RED.nodes.registerType("read-variable", function (config) {
    RED.nodes.createNode(this, config)
    const node = this

    // Try to find initial value, only if we are not using a wildcard
    if(!config.variable_name.includes('*')) {
      const entry = node.context().global.get('hexa-ai:variables.' + config.variable_name)
      if (entry) {
        // If found, send the initial value of the variable into the output
        node.send({ payload: entry.value, topic: entry.name, origin: entry })
      }
    }

    // Send to the output the variable when updated
    const updated = function (entry) {
      node.send({ payload: entry.value, topic: entry.name, origin: entry })
    }

    // Watch events
    bus.on('variable-updated:' + config.variable_name, updated)

    // Unwatch events on node close
    node.on('close', function () {
      bus.removeListener('variable-updated:' + config.variable_name, updated)
    })
  })
}