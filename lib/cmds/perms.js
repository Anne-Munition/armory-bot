'use strict'
exports.info = {
  desc: 'Manage command permissions for this guild.',
  usage: '<commandName> [allow | deny | remove]',
  aliases: [],
  hidden: true,
  permissions: ['SEND_MESSAGES'],
}

exports.run = (client, msg, params = []) =>
  new Promise(async (resolve, reject) => {
    if (msg.channel.type === 'dm') {
      client.utils.dmDenied(msg).then(resolve).catch(reject)
      return
    }
    if (params.length === 0) {
      client.utils.usage(msg, exports.info).then(resolve).catch(reject)
      return
    }
    params = params.map((x) => x.toLowerCase())
    // Get first passed parameter - COMMAND
    const cmd = params[0]
    client.logger.debug('perms cmd:', cmd)
    // We don't want to add permissions for commands that do not exits
    if (!client.commands.has(cmd)) {
      msg
        .reply(
          `Cannot set or alter permissions for commands that do not exist or are nor loaded. ` +
            `\`\`${msg.prefix}cmds\`\` to see list.`,
        )
        .then(resolve)
        .catch(reject)
      return
    }
    let result
    try {
      result = await client.mongo.perms.findOne({
        server_id: msg.guild.id,
        cmd: cmd,
      })
    } catch (err) {
      client.logger.error(err)
      msg.channel.send('There was a database error, please try again.')
      reject(err)
      return
    }

    // If there is no result, make a new, blank permission
    if (!result) {
      result = client.mongo.perms({
        server_id: msg.guild.id,
        cmd,
      })
    }

    // If no action set or action is list, show list even if plank perm that is not saved yet
    if (params.length < 2 || (params[1] && params[1] === 'id')) {
      const obj = {
        cmd: result.cmd,
        perms: result.perms,
      }
      if (!params[1] && params[1] !== 'id') {
        obj.perms.allow.members = obj.perms.allow.members
          .map((m) => msg.guild.members.cache.get(m))
          .filter((m) => m)
          .map((m) => m.user.username)
        obj.perms.allow.channels = obj.perms.allow.channels
          .map((c) => msg.guild.channels.get(c))
          .filter((c) => c)
          .map((m) => m.name)
        obj.perms.allow.roles = obj.perms.allow.roles
          .map((r) => msg.guild.roles.cache.get(r))
          .filter((r) => r)
          .map((r) => r.name)
        obj.perms.deny.members = obj.perms.deny.members
          .map((m) => msg.guild.members.cache.get(m))
          .filter((m) => m)
          .map((m) => m.user.username)
        obj.perms.deny.channels = obj.perms.deny.channels
          .map((c) => msg.guild.channels.get(c))
          .filter((c) => c)
          .map((c) => c.name)
        obj.perms.deny.roles = obj.perms.deny.roles
          .map((r) => msg.guild.roles.cache.get(r))
          .filter((r) => r)
          .map((r) => r.name)
      }
      msg.channel
        .send(JSON.stringify(obj, null, 2), { code: 'json' })
        .then(resolve)
        .catch(reject)
      return
    }

    // Get next passed parameter - ACTION (allow, deny, remove)
    const action = params[1] ? params[1] : null
    // Show usage if missing ACTION
    if (action !== 'allow' && action !== 'deny' && action !== 'remove') {
      exports.info.usage = `${cmd} <allow | deny | remove>`
      client.utils.usage(msg, exports.info).then(resolve).catch(reject)
      return
    }
    // Get next passed parameter - TYPE (user, channel, role)
    const type = params[2] ? params[2] : null
    // Show usage if missing TYPE
    if (type !== 'member' && type !== 'channel' && type !== 'role') {
      exports.info.usage = `${cmd} ${action} <member | channel | role>`
      client.utils.usage(msg, exports.info).then(resolve).catch(reject)
      return
    }
    // Get next passed parameter - TARGET (mention, id, or name)
    const target = params[3] ? params.slice(3).join(' ') : null
    if (!target) {
      exports.info.usage = `${cmd} ${action} ${type} <target>`
      client.utils.usage(msg, exports.info).then(resolve).catch(reject)
      return
    }
    client.logger.debug(cmd, action, type, target)

    // Resolve the TARGET to a Discord ID
    const data = { cmd, action, type, target }
    targetToId(client, msg, data, (err, id) => {
      if (err) {
        client.logger.error(err)
        msg
          .reply(
            'There was an error performing this operation. Please try again.',
          )
          .then(resolve)
          .catch(reject)
      } else {
        data.id = id
        client.logger.debug('target to id:', data.id)
        alterDbEntry(client, msg, data)
          .then(() => {
            msg
              .reply('The permissions operation completed successfully.')
              .then(resolve)
              .catch(reject)
          })
          .catch((e) => {
            client.logger.error(e)
            msg
              .reply(
                'There was an error performing this operation. Please try again.',
              )
              .then(resolve)
              .catch(reject)
          })
      }
    })
  })

function alterDbEntry(client, msg, data) {
  return new Promise(async (resolve, reject) => {
    data.type = `${data.type}s`
    let result
    try {
      result = await client.mongo.perms.findOne({
        server_id: msg.guild.id,
        cmd: data.cmd,
      })
    } catch (err) {
      reject(err)
      return
    }
    if (!result) {
      // There are no permissions set yet, make a new entry
      result = client.mongo.perms({
        server_id: msg.guild.id,
        cmd: data.cmd,
      })
    }
    const allowI = result.perms.allow[data.type].indexOf(data.id)
    const denyI = result.perms.deny[data.type].indexOf(data.id)
    if (allowI > -1) {
      result.perms.allow[data.type].splice(allowI, 1)
    }
    if (denyI > -1) {
      result.perms.deny[data.type].splice(denyI, 1)
    }
    if (data.action !== 'remove') {
      result.perms[data.action][data.type].push(data.id)
    }
    result
      .save()
      .then(resolve)
      .catch((err) => {
        client.logger.error(err)
        msg.channel.send('There was a database error, please try again.')
        reject(err)
      })
  })
}

function targetToId(client, msg, data, callback) {
  // Works for ID only or for a mention which has the id inside of it
  const matchId = data.target.match(/(\d+)/)
  let result
  let matches

  if (data.type === 'member') {
    // Was the user target a mention
    if (matchId) {
      // Target was a mention, get member to make sure the bot can resolve it
      result = msg.guild.members.cache.get(matchId[1])
      if (result) {
        return callback(null, result.id)
      } else {
        return callback('No match found.')
      }
    } else {
      // Target was not a mention, search names and nicknames
      const userMatches = msg.guild.members.filter((m) =>
        m.user.username.toLowerCase().includes(data.target),
      )
      const nickMatches = msg.guild.members.filter(
        (m) => m.nickname && m.nickname.toLowerCase().includes(data.target),
      )
      matches = userMatches.concat(nickMatches)
      client.logger.debug('user matches', matches.size)
      if (matches.size === 0) {
        return callback('No matches found.')
      }
      if (matches.size === 1) {
        return callback(null, matches.first().id)
      }
    }
  } else if (data.type === 'channel') {
    // Was the channel target a mention
    if (matchId) {
      // Target was a mention, get channel to make sure the bot can resolve it
      result = msg.guild.channels.get(matchId[1])
      if (result) {
        return callback(null, result.id)
      } else {
        return callback('No match found.')
      }
    } else {
      // Target was not a mention, search channel names
      matches = msg.guild.channels.filter((c) =>
        c.name.toLowerCase().includes(data.target),
      )
      client.logger.debug('channel matches', matches.size)
      if (matches.size === 0) {
        return callback('No matches found.')
      }
      if (matches.size === 1) {
        return callback(null, matches.first().id)
      }
    }
  } else if (data.type === 'role') {
    // Was the role target a mention
    if (matchId) {
      // Target was a mention, get role to make sure the bot can resolve it
      result = msg.guild.roles.cache.get(matchId[1])
      if (result) {
        return callback(null, result.id)
      } else {
        return callback('No match found.')
      }
    } else if (data.target === 'everyone') {
      return callback(null, msg.guild.id)
    } else {
      // Target was not a mention, search role names
      matches = msg.guild.roles.filter((r) =>
        r.name.toLowerCase().includes(data.target),
      )
      client.logger.debug('role matches', matches.size)
      if (matches.size === 0) {
        return callback('No matches found.')
      }
      if (matches.size === 1) {
        return callback(null, matches.first().id)
      }
    }
  }
  userMatchWait(msg, data, matches)
    .then((id) => {
      if (id) {
        return callback(null, id)
      } else {
        return callback(
          `No Discord '${data.type}' id match found for **${data.target}**`,
        )
      }
    })
    .catch((err) => {
      client.logger.error(err)
      if (typeof err === 'string') {
        return callback(err)
      } else {
        return callback('Error while waiting for user selection.')
      }
    })
  return null
}

function userMatchWait(msg, data, matches) {
  return new Promise((resolve, reject) => {
    let str = `Multiple matches found for **${data.target}**\nPlease select a number within 20 seconds...\n`
    let count = 0
    matches.forEach((m) => {
      count++
      str += `\n\`\`${count}.\`\` ${m.user.username} #${
        m.user.discriminator
      } (${m.nickname || 'No Nickname'})`
    })
    msg.channel
      .send(str)
      .then((matchMessage) => {
        const collector = msg.channel.createMessageCollector(
          (m) => m.author.id === msg.author.id && !isNaN(parseInt(m.content)),
          {
            time: 20000,
            maxMatches: 1,
          },
        )
        collector.on('end', (collected, reason) => {
          if (reason === 'time') {
            matchMessage.delete()
            reject('You took to long to reply.')
            return
          }
          if (reason === 'matchesLimit') {
            const num = parseInt(collected.first().content)
            if (num < 1 || num > matches.size) {
              reject('The number you entered is out of range.')
              return
            }
            matchMessage.delete()
            collected.first().delete()
            resolve(matches.map((m) => m.user.id)[num - 1])
          }
        })
      })
      .catch(reject)
  })
}
