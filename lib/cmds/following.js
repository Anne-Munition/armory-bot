'use strict'
exports.info = {
  desc: 'Posts Twitch following info for the user provided.',
  usage: '<user> [channel]',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
}

const axios = require('axios')

exports.run = (client, msg, params = []) =>
  new Promise(async (resolve, reject) => {
    // Exit if only cmd was ran with no names
    if (params.length === 0) {
      client.utils.usage(msg, exports.info).then(resolve).catch(reject)
      return
    }
    // Lowercase all params
    params = params.map((p) => p.toLowerCase())
    // extract from_user
    const user = params[0]
    // to_user is supplied or pulled from config as default
    const channel = params[1]
      ? params[1]
      : client.config.twitch.channel.toLowerCase()
    // Get the userData for both users
    const { data: userData } = await axios.get(
      `https://api.twitch.tv/helix/users?login=${user}&login=${channel}`,
      {
        headers: {
          'Client-ID': client.config.twitch.client_id,
          Authorization: `Bearer ${client.config.twitch.access_token}`,
        },
      },
    )
    const { data: users } = userData
    // An error occurred if we have no data
    if (!users) {
      msg.reply('Twitch API Error')
      reject()
      return
    }
    // Make sure we got data back about both users or inform the user
    if (!users.find((x) => x.login === user.toLowerCase())) {
      msg
        .reply(`**${user}** is not a registered Twitch channel.`)
        .then(resolve)
        .catch(reject)
      return
    } else if (!users.find((x) => x.login === channel.toLowerCase())) {
      msg
        .reply(`**${channel}** is not a registered Twitch channel.`)
        .then(resolve)
        .catch(reject)
      return
    }
    // Get localized display_names
    const nameA = client.twitch.displayName(users[0])
    const nameB = client.twitch.displayName(users[1])
    // Get following data
    const uri = client.utils.buildUri(
      'https://api.twitch.tv/helix/users/follows',
      {
        from_id: users[0].id,
        to_id: users[1].id,
      },
    )
    const { data: followingData } = await axios.get(uri, {
      headers: {
        'Client-ID': client.config.twitch.client_id,
        Authorization: `Bearer ${client.config.twitch.access_token}`,
      },
    })
    const { data: following } = followingData
    // Not Following
    if (!following.length) {
      msg.channel
        .send(`**${nameA}** does not follow **${nameB}**`)
        .then(resolve)
        .catch(reject)
      return
    }
    // Is Following
    msg.channel
      .send(
        `**${nameA}** has been following **${nameB}** since: ` +
          `\`\`${following[0].followed_at}\`\`\n${client.utils.formatTimeDiff(
            following[0].followed_at,
          )}`,
      )
      .then(resolve)
      .catch(reject)
  })
