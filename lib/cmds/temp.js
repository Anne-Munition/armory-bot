'use strict'
exports.info = {
  desc: 'Convert temperature to Celsius or Fahrenheit.',
  usage: '<number><C|F>',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
}

exports.run = (client, msg, params = []) =>
  new Promise((resolve, reject) => {
    // Lowercase all params
    params = params.map((x) => x.toLowerCase())
    // Show usage if no params given
    if (params.length === 0) {
      return client.utils.usage(msg, exports.info).then(resolve).catch(reject)
    }
    // If only 1 param see if it ends with C or F
    if (params.length === 1) {
      const r = /^(-?\d+)([cf])$/
      if (!r.test(params[0])) {
        return client.utils.usage(msg, exports.info).then(resolve).catch(reject)
      }
      const match = params[0].match(r)
      const temp = parseInt(match[1])
      const unit = match[2]
      const response = convert(temp, unit)
      msg.channel.send(response).then(resolve).catch(reject)
    }
    if (params.length === 2) {
      const temp = parseInt(params[0])
      const unit = params[1]
      if ((unit !== 'c' && unit !== 'f') || Number.isNaN(temp)) {
        return client.utils.usage(msg, exports.info).then(resolve).catch(reject)
      }
      const response = convert(temp, unit)
      msg.channel.send(response).then(resolve).catch(reject)
    }
  })

function convert(temp, unit) {
  let converted
  switch (unit) {
    case 'c':
      converted = `${Math.round(temp * (9 / 5) + 32)}F`
      break
    case 'f':
      converted = `${Math.round((temp - 32) * (5 / 9))}C`
      break
  }
  return `${temp}${unit.toUpperCase()} => **${converted}**`
}
