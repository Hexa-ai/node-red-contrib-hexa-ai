const EventEmitter2 = require('eventemitter2')
var bus = new EventEmitter2({
  wildcard: true,
  delimiter: '.',
})
module.exports = bus