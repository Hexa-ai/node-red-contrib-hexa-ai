const bus = require('../bus')

module.exports = function (RED) {
  RED.nodes.registerType("write-variable", function (config) {
    RED.nodes.createNode(this, config)
    const node = this

    // Build up the default variable entry where we will append some data ...
    const defaultEntry = {
      name: config.variable_name,
      type: config.variable_type,
      unit: config.variable_unit,
      value: null,
      ts: null,
      config,
      meta: {
        last_history_value: null,
        is_alarm_triggered: false
      }
    }

    // Write the variable into the context when the node is created, it allow us to have autocompletion where no
    // variable has been written yet. Only if we had set a variable name in the node configuration
    if (config.variable_name) {
      node.context().global.set('hexa-ai:variables.' + config.variable_name, defaultEntry)
    }

    this.on('input', function (msg, send, done) {
      // Check if the variable name is set in the node configuration or in the msg.topic property
      if (!(msg.topic || config.variable_name)) {
        node.warn('Variable name is required. You should set it in the node configuration or in the msg.topic property')
        return
      }

      // Sanitize the input payload to the variable type
      msg.payload = sanitizeInputPayload(msg.payload, config)

      // Build the variable entry to be stored in the global context
      const entry = {
        ...defaultEntry,
        name: msg.topic || config.variable_name,
        value: msg.payload,
        ts: msg.ts || Date.now(),
      }

      /*
       * History
       */
      if (config.history === "enabled" && ['real', 'integer'].includes(config.variable_type)) {
        // Get the last value of the variable and check if the new value should be stored instead the old one
        entry.meta.last_history_value = node.context().global.get('hexa-ai:variables.' + (msg.topic || config.variable_name) + '.meta.last_history_value') || null
        const valueChanged = entry.meta.last_history_value !== msg.payload
        const hysteresisValid = config.history_hysteresis !== "" ? Math.abs(entry.meta.last_history_value - msg.payload) >= config.history_hysteresis : true

        // If the value has changed and the hysteresis is valid, continue with the history update
        if (valueChanged && hysteresisValid) {
          // Set the history value updated
          entry.meta.last_history_value = msg.payload

          // Push entry to the history buffer
          bus.emit('history-buffer:push', { ...entry, meta: {} })
        }
      }

      /*
       * Alarm
       */
      if (config.alarm === "enabled") {
        let trigger = false

        // Check for each variable type if the alarm should be triggered
        if (['real', 'integer'].includes(config.variable_type)) {
          if (config.alarm_numeric_lower !== "" && msg.payload < config.alarm_numeric_lower) {
            trigger = true
          } else if (config.alarm_numeric_upper !== "" && msg.payload > config.alarm_numeric_upper) {
            trigger = true
          }
        } else if (config.variable_type === 'boolean') {
          if (config.alarm_boolean_trigger === msg.payload) {
            trigger = true
          }
        } else if (config.variable_type === 'string') {
          if (config.alarm_string_trigger === msg.payload) {
            trigger = true
          }
        }

        // Check if the alarm has been triggered before
        entry.meta.is_alarm_triggered = node.context().global.get('hexa-ai:variables.' + (msg.topic || config.variable_name) + '.meta.is_alarm_triggered') || false

        // If the alarm has been triggered before and the new value is not the same
        if (entry.meta.is_alarm_triggered !== trigger) {
          entry.meta.is_alarm_triggered = trigger

          // Push the entry to the history buffer
          bus.emit('history-buffer:push', {
            ...entry,
            name: (msg.topic || config.variable_name) + '.alarm',
            value: entry.meta.is_alarm_triggered,
            meta: {}
          })

          // Fire the trigger or end message/event
          if (trigger) {
            bus.emit('alarm-triggered', entry)
          } else {
            bus.emit('alarm-ended', entry)
          }
        }
      }

      // Write the variable entry to the global context
      node.context().global.set('hexa-ai:variables.' + (msg.topic || config.variable_name), entry)

      // Send the update event for read variable
      bus.emit('variable-updated:' + (msg.topic || config.variable_name), entry)

      if (done) done()
    })
  })
}

const sanitizeInputPayload = (value, config) => {
  if (config.variable_type === 'real') {
    value = parseFloat(value)
  } else if (config.variable_type === 'integer') {
    value = parseInt(value)
  } else if (config.variable_type === 'boolean') {
    value = !!value
  }

  return value
}
