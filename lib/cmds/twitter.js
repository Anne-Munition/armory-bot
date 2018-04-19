'use strict';
exports.info = {
  desc: 'Manage posting Tweets to Discord channels.',
  usage: '<add | remove | list>',
  aliases: [],
  hidden: true,
  permissions: ['SEND_MESSAGES'],
};

// <add | remove | list> channels to post tweets to
exports.run = (client, msg, params = []) => new Promise(async (resolve, reject) => {
  if (msg.channel.type === 'dm') {
    client.utils.dmDenied(msg).then(resolve).catch(reject);
    return;
  }
  if (params.length === 0) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  // Lowercase all parameters
  params = params.map(p => p.toLowerCase());
  client.logger.debug(JSON.stringify(params));
  if (params[0] === 'list') {
    let results;
    try {
      results = await client.mongo.twitterChannels.find({});
    } catch (err) {
      msg.reply('There was a database error. Please try again.');
      reject(err);
      return;
    }
    client.logger.debug('twitter list results:', results.length);
    if (results.length === 0) {
      msg.channel.send('No twitter accounts are currently posting tweets to any channels.');
      return;
    }
    let str = '';
    if (params[1] === 'all' && msg.author.id === client.config.owner_id) {
      client.logger.debug('list all guilds');
      results.forEach(result => {
        const channels = result.channels.map(c => client.channels.get(c.channel_id))
          .filter(x => x)
          .map(x => `${client.Discord.escapeMarkdown(x.guild.name)} - **#${client.Discord.escapeMarkdown(x.name)}**`);
        if (channels.length > 0) {
          str += `**${client.Discord.escapeMarkdown(client.utils.makePossessive(result.screen_name))}** ` +
            `tweets are posted to:\n`;
          str += channels.join('\n');
          str += '\n\n';
        }
      });
    } else {
      client.logger.debug('list this guild');
      results.filter(n => {
        const s = n.channels.filter(c => c.server_id === msg.guild.id);
        return !(s === null);
      })
        .forEach(n => {
          const channels = n.channels.filter(c => c.server_id === msg.guild.id)
            .map(c => {
              const channel = client.channels.get(c.channel_id);
              return channel ? channel.toString() : '';
            });
          if (channels.length > 0) {
            str += `**${client.Discord.escapeMarkdown(client.utils.makePossessive(n.screen_name))}** ` +
              `tweets are posted to:\n`;
            str += channels.join('\n');
            str += '\n\n';
          }
        });
    }
    if (!str) {
      msg.channel.send('No twitter accounts are currently posting tweets to any channels.')
        .then(resolve).catch(reject);
      return;
    }
    msg.channel.send(str, { split: { maxLength: 1800 } }).then(resolve).catch(reject);
  } else if (params[0] === 'test') {
    if (!params[1]) return;
    if (msg.author.id !== client.config.owner_id) return;
    client.twitter.tweetTest(params[1])
      .catch(() => {
        msg.reply('There was an error testing that tweet. Please try again.').then(resolve).catch(reject);
      });
  } else {
    if (params[0] !== 'add' && params[0] !== 'remove') {
      client.utils.usage(msg, exports.info).then(resolve).catch(reject);
      return;
    }
    if (params.length < 2) {
      exports.info.usage = `${params[0]} <twitterName>`;
      client.utils.usage(msg, exports.info).then(resolve).catch(reject);
      return;
    }
    const r = new RegExp(`^${params[1]}$`, 'i');
    let result;
    try {
      result = await client.mongo.twitterChannels.findOne({ screen_name: { $regex: r } });
    } catch (err) {
      client.logger.error(err);
      msg.reply('There was a database error. Please try again.');
      reject(err);
      return;
    }
    client.logger.debug('twitterChannels match result', JSON.stringify(result, null, 2));
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
  return new Promise(async (resolve, reject) => {
    if (result) {
      const chan = result.channels.filter(x => x.server_id === msg.guild.id && x.channel_id === msg.channel.id);
      if (chan.length === 0) {
        result.channels.push({
          server_id: msg.guild.id,
          channel_id: msg.channel.id,
        });
        result.save({ upsert: true })
          .then(() => {
            msg.channel.send(`This channel will now receive tweets from **${result.screen_name}**`)
              .then(resolve).catch(reject);
          })
          .catch(err => {
            client.logger.error(err);
            msg.channel.send('There was a database error, please try again.');
            reject(err);
          });
      } else {
        msg.channel.send(`This channel already receives tweets from **${result.screen_name}**`)
          .then(resolve).catch(reject);
      }
    } else {
      // We are not streaming this twitter user yet.
      let user;
      try {
        user = await client.twitter.getUser(params[1]);
        user = {
          screen_name: user[0].screen_name,
          id: user[0].id_str,
          channels: [
            {
              server_id: msg.guild.id,
              channel_id: msg.channel.id,
            },
          ],
        };
      } catch (err) {
        client.logger.error('Error getting twitter user', params[1], err);
        if (err[0] || err[0].code === 17) {
          msg.channel.send(`**${params[1]}** is not a known twitter user.`).then(resolve).catch(reject);
        }
        return;
      }
      const entry = client.mongo.twitterChannels(user);
      try {
        await entry.save();
      } catch (err) {
        client.logger.error(err);
        msg.channel.send('There was a database error, please try again.');
        reject(err);
      }
      msg.channel.send(`This channel will now receive tweets from ` +
        `**${user.screen_name}**\n\nWe are not yet streaming that twitter account. ` +
        `Please allow up to 10 minutes to sync.\n` +
        `Type \`\`yes\`\` within 15 seconds to be notified when it syncs.`)
        .then(() => {
          const collector = msg.channel.createMessageCollector(
            x => x.author.id === msg.author.id, { time: 15000 });
          collector.on('collect', m => {
            if (m.content.toLowerCase() === 'yes') {
              client.twitter.mentions.push({
                user: msg.author,
                channel: msg.channel,
                screen_name: user.screen_name,
              });
              collector.stop();
              msg.reply(':thumbsup:').then(resolve).catch(reject);
            }
          });

          collector.on('end', (messages, reason) => {
            if (reason === 'time') resolve();
          });
        }).catch(reject);
    }
  });
}

function removeChannel(client, msg, result, params) {
  return new Promise(async (resolve, reject) => {
    if (result) {
      let index = -1;
      for (let i = 0; i < result.channels.length; i++) {
        if (result.channels[i].channel_id === msg.channel.id) {
          index = i;
          break;
        }
      }
      if (index === -1) {
        msg.channel.send(`**${result.screen_name}** is not registered to receive tweets in this channel.`)
          .then(resolve).catch(reject);
      } else {
        result.channels.splice(index, 1);
        try {
          if (result.channels.length === 0) {
            await result.remove();
          } else {
            await result.save({ upsert: true });
          }
        } catch (err) {
          client.logger.error(err);
          msg.channel.send('There was a database error, please try again.');
          reject(err);
          return;
        }
        msg.channel.send(`This channel will no longer receive tweets from **${result.screen_name}**`)
          .then(resolve).catch(reject);
      }
    } else {
      let user;
      try {
        user = await client.twitter.getUser(params[1]);
      } catch (err) {
        client.logger.error('Error getting twitter user', params[1], err);
        if (err[0] || err[0].code === 17) {
          msg.channel.send(`**${params[1]}** is not a known twitter user.`).then(resolve).catch(reject);
        }
        return;
      }
      msg.channel.send(`**${user[0].screen_name}** is not registered to post tweets in any channels.`)
        .then(resolve).catch(reject);
    }
  });
}
