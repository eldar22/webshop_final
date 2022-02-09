const exportFns = {}
const getColorMsg = require('./colormsg.js')
const msgTypes = require('./msgTypes')()

function logMsg (type) {
  return function (msg, original) {
    console.log(getColorMsg(type, msg, original))
  }
}

Object.keys(msgTypes).map(k => exportFns[k] = logMsg(k))

module.exports = exportFns
