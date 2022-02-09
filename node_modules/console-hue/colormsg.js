const shouldStringify = ['Object', 'Array']
const msgTypes = require('./msgTypes')()

function getStr (msg, original = false) {
  if (!msg || original) {
    return msg
  } else if (shouldStringify.includes(msg.constructor.name)) {
    return JSON.stringify(msg)
  }
  return msg
}

module.exports = function (type, msg, original) {
  return `${msgTypes[type]}${getStr(msg, original)}${msgTypes['log']}`
}
