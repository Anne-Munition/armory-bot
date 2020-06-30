'use strict'
exports.info = {
  desc: 'Enable / Disable Sub Games. (Adds / Removes Voice Channels)',
  usage: '<enable | disable>',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
}

exports.run = (client, msg, params = []) =>
  new Promise(async (resolve, reject) => {
    if (msg.channel.type === 'dm') {
      client.utils.dmDenied(msg).then(resolve).catch(reject)
      return
    }
    // allow command only from #mod channels
    // this means only moderators can run this command
    // so no need to role check
    if (!msg.channel.name.startsWith('mod-')) return resolve()

    if (params.length === 0) {
      client.utils.usage(msg, exports.info).then(resolve).catch(reject)
      return
    }
    params = params.map((p) => p.toLowerCase())

    const voiceChannels = [
      'Sub Group 1',
      'Sub Group 2',
      'Sub Group 3',
      'Sub Group 4',
      'Sub Group 5',
      'Sub Free Agents',
    ]

    async function addChannels() {
      const generalChannel = msg.guild.channels.cache.find(
        (x) => x.type === 'voice' && x.name === 'General',
      )
      let pos = generalChannel ? generalChannel.position + 1 : 0
      for (let i = 0; i < voiceChannels.length; i++) {
        const limit = voiceChannels[i].toLowerCase().includes('free') ? 10 : 5
        const match = msg.guild.channels.cache.find(
          (x) => x.type === 'voice' && x.name === voiceChannels[i],
        )
        if (!match) {
          await msg.guild.channels.create(voiceChannels[i], {
            type: 'voice',
            position: pos++,
            userLimit: limit,
          })
        } else {
          if (match.position < pos) pos--
          await match.edit({ position: pos++, userLimit: limit })
        }
      }
    }

    async function deleteChannels() {
      for (let i = 0; i < voiceChannels.length; i++) {
        const match = msg.guild.channels.cache.find(
          (y) => y.name === voiceChannels[i],
        )
        if (match) await match.delete()
      }
    }

    switch (params[0]) {
      case 'on':
      case 'enable':
      case 'start':
      case 'add':
        await addChannels()
        msg
          .reply(
            'Sub Games have been **enabled**. Voice Channels created and ready.',
          )
          .then(resolve)
          .catch(reject)
        break
      case 'off':
      case 'disable':
      case 'stop':
      case 'remove':
        await deleteChannels()
        msg
          .reply(
            'Sub Games have been **disabled**. Voice channels have been removed.',
          )
          .then(resolve)
          .catch(reject)
        break
      default:
        client.utils.usage(msg, exports.info).then(resolve).catch(reject)
    }
  })
