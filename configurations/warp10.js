module.exports = function (RED) {
  function Warp10Node(n) {
    RED.nodes.createNode(this, n)
    this.endpoint = n.endpoint
    this.token = n.token
  }
  RED.nodes.registerType("warp10", Warp10Node)
}