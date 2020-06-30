'use strict'
exports.info = {
  desc: 'Reported Twitch Users.',
  usage: '<expression>',
  aliases: [],
  hidden: true,
  permissions: ['SEND_MESSAGES'],
}

const request = require('snekfetch')
const moment = require('moment')

exports.run = (client, msg, params = []) =>
  new Promise(async (resolve, reject) => {
    params = params.map((x) => x.toLowerCase())
    // Show list if no params are used
    if (params.length === 0) {
      const reported = await request.get(
        `${client.config.streamInfoLoc}/reported`,
      )
      if (!reported) {
        msg.channel
          .send('Error getting reported users from the database.')
          .then(resolve)
          .catch(reject)
        return
      }
      if (reported.body.length === 0) {
        msg.channel
          .send('There are currently **no** users reported waiting on a ban.')
          .then(resolve)
          .catch(reject)
        return
      }
      const str = '```Reported Users:```\n'
      const names = reported.body
        .sort((a, b) => {
          if (a.created_at > b.created_at) return 1
          if (a.created_at < b.created_at) return -1
          return 0
        })
        .map((x) => {
          const duration = moment.duration(
            moment(x.created_at).valueOf() - Date.now(),
          )
          return `**${x.username}**: ${duration.humanize(true)}`
        })
      msg.channel
        .send(`${str}${names.join('\n')}`)
        .then(resolve)
        .catch(reject)
      return
    }
    if (params[0] === 'purgeall') {
      request
        .get(`${client.config.streamInfoLoc}/reported/purge`)
        .then(() => {
          msg.channel
            .send('Purged reported list **OK**.')
            .then(resolve)
            .catch(reject)
        })
        .catch(() => {
          msg.channel
            .send('There was an error purging the reported list.')
            .then(resolve)
            .catch(reject)
        })
      return
    }
    if (params[0] === 'purge' && params[1]) {
      request
        .get(`${client.config.streamInfoLoc}/reported/purge/${params[1]}`)
        .then(() => {
          msg.channel
            .send(`Purged **${params[1]}** OK.`)
            .then(resolve)
            .catch(reject)
        })
        .catch((err) => {
          if (err.status === 404) {
            msg.channel
              .send(`**${params[1]}** does not exist in the report database.`)
              .then(resolve)
              .catch(reject)
          } else {
            msg.channel
              .send(`There was an error purging **${params[1]}**.`)
              .then(resolve)
              .catch(reject)
          }
        })
    }
  })
