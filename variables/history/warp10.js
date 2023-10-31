const bus = require('../../bus')
const axios = require('axios')

const script = `
'__WRITE_TOKEN__' 'writeToken' STORE

<'
__PAYLOAD__
'> 
JSON-> 'payload' STORE

[] 'gts' STORE

// Parse payload
$payload
<% 
  [ 'key' 'value' ] STORE // object is a map
  NEWGTS $key RENAME 
  { 
    'gtsType' $value 'type' GET
    'dataType' $value 'origin' GET 'variable_type' GET
    
  } RELABEL
  {
    'variable_unit' $value 'origin' GET 'variable_unit' GET
    'alarm_trigger_message' $value 'origin' GET 'alarm_trigger_message' GET
    'alarm_end_message' $value 'origin' GET 'alarm_end_message' GET
    'alarm_boolean_trigger' $value 'origin' GET 'alarm_boolean_trigger' GET TOSTRING
    'alarm_string_trigger' $value 'origin' GET 'alarm_string_trigger' GET TOSTRING
    'alarm_numeric_lower' $value 'origin' GET 'alarm_numeric_lower' GET TOSTRING
    'alarm_numeric_upper' $value 'origin' GET 'alarm_numeric_upper' GET TOSTRING
  } SETATTRIBUTES

  $value 'values' GET
  <% 
    [ 'ValuesValue' ] STORE // object is a list
    $ValuesValue 1 GET 1000 * NaN NaN NaN $ValuesValue 0 GET ADDVALUE
  %>
  FOREACH

  'newGts' STORE

  $gts [ $newGts ] APPEND 'gts' STORE
%>
FOREACH

$gts

$gts $writeToken UPDATE
`

module.exports = function (RED) {
  RED.nodes.registerType("history-warp10", function (config) {
    RED.nodes.createNode(this, config)
    const node = this

    // Init an empty buffer
    let buffer = {}
    let bufferSize = 0

    node.status({ fill: "grey", shape: "dot", text: "Buffer size : " + bufferSize })

    // When we need to push a new value to the buffer
    const pushed = function (entry) {
      // Prepare the entry into the buffer if not exists
      if (!(entry.name in buffer)) {
        buffer[entry.name] = {
          origin: entry.config,
          type: entry.alarm ? 'alarm' : 'metric',
          values: []
        }
      }

      // Add a value to the buffer
      buffer[entry.name].values.push([entry.value, entry.ts])
      bufferSize++

      node.status({ fill: "green", shape: "dot", text: "Buffer size : " + bufferSize })
    }

    // Interval to flush the buffer into the warp10 endpoint
    const interval = setInterval(async function () {
      if (bufferSize > 0) {
        node.status({ fill: "green", shape: "ring", text: "Buffer size : " + bufferSize })

        // Get the configuration node for the credentials
        target = RED.nodes.getNode(config.target)

        // Build the script to execute
        let bufferScript = script
          .replace('__WRITE_TOKEN__', target.token)
          .replace('__PAYLOAD__', JSON.stringify(buffer))

        // Empty the buffer
        buffer = {}
        bufferSize = 0

        // Push the buffer to the endpoint
        try {
          console.log('Pushing warp10 script to ' + target.endpoint + '/exec')
          console.log(bufferScript)
          await axios.post(target.endpoint + '/exec', bufferScript)
        } catch (error) {
          let message = ''
          try { message = error.response.data.message } catch { }
          node.error("Could not flush buffer into warp10 endpoint : " + (message ? message : error.message))
        }

        node.status({ fill: "grey", shape: "dot", text: "Buffer size : " + bufferSize })
      }
    }, (config.interval * 1000) || 1000)

    // Watch events
    bus.on('history-buffer:push', pushed)

    // Unwatch events and stop interval on node close
    node.on('close', function () {
      bus.removeListener('history-buffer:push', pushed)
      clearTimeout(interval)
    })
  })
}