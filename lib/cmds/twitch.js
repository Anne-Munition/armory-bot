'use strict';
exports.info = {
  desc: 'Manage which channels post when Twitch streams go live.',
  usage: '<add | remove | list>',
  aliases: [],
};

// <add | remove | list> channels to post tweets to
exports.run = (client, msg, params = []) => new Promise(async(resolve, reject) => {
  if (msg.channel.type === 'dm') {
    client.utils.dmDenied(msg).then(resolve).catch(reject);
    return;
  }
  if (params.length === 0) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  params = params.map(p => p.toLowerCase());
  client.logger.debug(JSON.stringify(params));
  if (params[0] === 'list') {
    let results;
    try {
      results = await client.mongo.twitchChannels.find({});
    } catch (err) {
      msg.reply('There was a database error. Please try again.');
      reject(err);
      return;
    }
    client.logger.debug('twitch list results:', results.length);
    if (results.length === 0) {
      msg.channel.send('No Twitch channels are currently posting when they go live.')
        .then(resolve).catch(reject);
      return;
    }
    let str = '';
    if (params[1] === 'all' && msg.author.id === client.config.owner_id) {
      client.logger.debug('list all guilds');
      results.forEach(n => {
        const channels = n.channels.map(c => client.channels.get(c.channel_id))
          .filter(x => x)
          .sort((a, b) => a.position - b.position)
          .map(x => `${client.Discord.escapeMarkdown(x.guild.name)} - **#${client.Discord.escapeMarkdown(x.name)}**`);
        if (channels.length > 0) {
          str += `${getListHeader(client, n.display_name)}${channels.join('\n')}\n\n`;
        }
      });
    } else {
      client.logger.debug('list this guild');
      const thisGuild = results.filter(n => {
        const s = n.channels.filter(c => c.server_id === msg.guild.id);
        return !(s === null);
      });
      thisGuild.forEach(n => {
        const channels = n.channels.filter(c => c.server_id === msg.guild.id)
          .map(c => client.channels.get(c.channel_id))
          .filter(x => x)
          .sort((a, b) => a.position - b.position)
          .map(x => x.toString());
        if (channels.length > 0) {
          str += `${getListHeader(client, n.display_name)}${channels.join('\n')}\n\n`;
        }
      });
    }
    if (!str) {
      msg.channel.send('No Twitch channels are currently posting when they go live.')
        .then(resolve).catch(reject);
      return;
    }
    msg.channel.send(str, { split: { maxLength: 1800 } }).then(resolve).catch(reject);
  } else {
    if (params[0] !== 'add' && params[0] !== 'remove') {
      client.utils.usage(msg, exports.info).then(resolve).catch(reject);
      return;
    }
    if (params.length < 2) {
      exports.info.usage = `${params[0]} <twitchChannel>`;
      client.utils.usage(msg, exports.info).then(resolve).catch(reject);
      return;
    }
    const r = new RegExp(params[1], 'i');
    let result;
    try {
      result = await client.mongo.twitchChannels.findOne({ display_name: { $regex: r } });
    } catch (err) {
      client.logger.error(err);
      msg.reply('There was a database error. Please try again.');
      reject(err);
      return;
    }
    client.logger.debug('twitchChannels match result', JSON.stringify(result, null, 2));
    switch (params[0]) {
      case 'add':
        addChannel(client, msg, result, params).then(resolve).catch(reject);
        break;
      case 'remove':
        removeChannel(client, msg, result, params).then(resolve).catch(reject);
        break;
      default:
        break;
    }
  }
});

function addChannel(client, msg, result, params) {
  return new Promise((resolve, reject) => {
    if (result) {
      // We are already tracking this twitch channel
      // See if we are tracking this twitch channel in this discord channel
      const chan = result.channels.filter(x => x.server_id === msg.guild.id && x.channel_id === msg.channel.id);
      if (chan.length === 0) {
        result.channels.push({
          server_id: msg.guild.id,
          channel_id: msg.channel.id,
        });
        result.save({ upsert: true })
          .then(() => {
            let n = '';
            if (client.twitch.waiting.indexOf(result.display_name.toLowerCase()) !== -1) {
              n = getWarningMessage();
            }
            msg.channel.send(`This channel will now be notified when **${result.display_name}** ` +
              `goes live on Twitch.${n}`).then(resolve).catch(reject);
          })
          .catch(err => {
            client.logger.error(err);
            msg.channel.send('There was a database error, please try again.');
            reject(err);
          });
      } else {
        msg.channel.send(`This channel already gets notified when ` +
          `**${result.display_name}** goes live on Twitch.`).then(resolve).catch(reject);
      }
    } else {
      // We are not monitoring this twitch channel yet.
      const uri = `https://api.twitch.tv/kraken/users?login=${params.slice(1).join(' ')}&api_version=5` +
        `&client_id=${client.config.twitch.client_id}`;
      client.logger.debug(uri);
      client.utils.requestJSON(uri)
        .then(body => {
          if (body._total === 0) {
            msg.channel.send(`**${params.slice(1).join(' ')}** is not a known Twitch channel.`)
              .then(resolve).catch(reject);
          } else {
            const data = {
              display_name: client.utils.twitchDisplayName(body.users[0].name, body.users[0].display_name),
              twitch_id: body.users[0]._id,
              channels: [
                {
                  server_id: msg.guild.id,
                  channel_id: msg.channel.id,
                },
              ],
            };
            const entry = client.mongo.twitchChannels(data);
            entry.save()
              .then(() => {
                msg.channel.send(`This channel will now be notified when **${data.display_name}** ` +
                  `goes live on Twitch.${getWarningMessage()}`).then(resolve).catch(reject);
                client.twitch.waiting.push(data.display_name.toLowerCase());
              })
              .catch(err => {
                client.logger.error(err);
                msg.channel.send('There was a database error, please try again.');
                reject(err);
              });
          }
        }).catch(reject);
    }
  });
}

function removeChannel(client, msg, result, params) {
  return new Promise((resolve, reject) => {
    if (result) {
      let index = -1;
      for (let i = 0; i < result.channels.length; i++) {
        if (result.channels[i].channel_id === msg.channel.id) {
          index = i;
        }
      }
      if (index === -1) {
        msg.channel.send(`This channel is not notified when **${result.display_name}** ` +
          `goes live on Twitch.`).then(resolve).catch(reject);
      } else {
        result.channels.splice(index, 1);
        if (result.channels.length === 0) {
          result.remove()
            .then(() => {
              msg.channel.send(`This channel will no longer be notified when ` +
                `**${result.display_name}** goes live on Twitch.`).then(resolve).catch(reject);
            })
            .catch(err => {
              client.logger.error(err);
              msg.channel.send('There was a database error, please try again.');
              reject(err);
            });
        } else {
          result.save({ upsert: true })
            .then(() => {
              msg.channel.send(`This channel will no longer be notified when ` +
                `**${result.display_name}** goes live on Twitch.`).then(resolve).catch(reject);
            })
            .catch(err => {
              client.logger.error(err);
              msg.channel.send('There was a database error, please try again.');
              reject(err);
            });
        }
      }
    } else {
      const uri = `https://api.twitch.tv/kraken/users?login=${params.slice(1).join(' ')}&api_version=5` +
        `&client_id=${client.config.twitch.client_id}`;
      client.logger.debug(uri);
      client.utils.requestJSON(uri)
        .then(body => {
          if (body._total === 0) {
            msg.channel.send(`**${params.slice(1).join(' ')}** is not a known Twitch channel.`)
              .then(resolve).catch(reject);
          } else {
            const name = client.utils.twitchDisplayName(body.users[0].name, body.users[0].display_name);
            msg.channel.send(`No channels are set to be notified when **${name}** ` +
              `goes live on Twitch.`).then(resolve).catch(reject);
          }
        }).catch(reject);
    }
  });
}

function getListHeader(client, name) {
  return `**${client.utils.makePossessive(name)}** Twitch streams post to:\n`;
}

function getWarningMessage() {
  return '\n\n We have not yet synced with this Twitch channel.' +
    '\nAn initial message may post within a few minutes if the channel is currently live.';
}
