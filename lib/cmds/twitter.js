'use strict';
exports.info = {
  desc: 'Manage posting Tweets to Discord channels.',
  usage: '<add | remove | list>',
  aliases: [],
};

const config = require('../../config');
const utils = require('../utilities');
const logger = require('winston');
const Discord = require('discord.js');

// <add | remove | list> channels to post tweets to
exports.run = (client, msg, params = []) => new Promise(async(resolve, reject) => {
  if (msg.channel.type === 'dm') {
    utils.dmDenied(msg).then(resolve).catch(reject);
    return;
  }
  if (params.length === 0) {
    utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  // Lowercase all parameters
  params = params.map(p => p.toLowerCase());
  logger.debug(JSON.stringify(params));
  if (params[0] === 'list') {
    let results;
    try {
      results = await client.mongo.twitterChannels.find({});
    } catch (err) {
      msg.reply('There was a database error. Please try again.');
      reject(err);
      return;
    }
    logger.debug('twitter list results:', results.length);
    if (results.length === 0) {
      msg.channel.sendMessage('No twitter accounts are currently posting tweets to any channels.');
      return;
    }
    let str = '';
    if (params[1] === 'all' && msg.author.id === config.owner_id) {
      logger.debug('list all guilds');
      results.forEach(result => {
        const channels = result.channels.map(c => client.channels.get(c.channel_id))
          .filter(x => x)
          .map(x => `${utils.removeFormatting(x.guild.name)} - **#${utils.removeFormatting(x.name)}**`);
        if (channels.length > 0) {
          str += `**${utils.removeFormatting(utils.makePossessive(result.screen_name))}** tweets are posted to:\n`;
          str += channels.join('\n');
          str += '\n\n';
        }
      });
    } else {
      logger.debug('list this guild');
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
            str += `**${utils.removeFormatting(utils.makePossessive(n.screen_name))}** tweets are posted to:\n`;
            str += channels.join('\n');
            str += '\n\n';
          }
        });
    }
    if (!str) {
      msg.channel.sendMessage('No twitter accounts are currently posting tweets to any channels.')
        .then(resolve).catch(reject);
      return;
    }
    msg.channel.sendMessage(str).then(resolve).catch(reject);
  } else {
    if (params[0] !== 'add' && params[0] !== 'remove') {
      utils.usage(msg, exports.info).then(resolve).catch(reject);
      return;
    }
    if (params.length < 2) {
      exports.info.usage = `${params[0]} <twitterName>`;
      utils.usage(msg, exports.info).then(resolve).catch(reject);
      return;
    }
    const r = new RegExp(params[1], 'i');
    let result;
    try {
      result = await client.mongo.twitterChannels.findOne({ screen_name: { $regex: r } });
    } catch (err) {
      logger.error(err);
      msg.reply('There was a database error. Please try again.');
      reject(err);
      return;
    }
    logger.debug('twitterChannels match result', JSON.stringify(result, null, 2));
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
  return new Promise(async(resolve, reject) => {
    if (result) {
      const chan = result.channels.filter(x => x.server_id === msg.guild.id && x.channel_id === msg.channel.id);
      if (chan.length === 0) {
        result.channels.push({
          server_id: msg.guild.id,
          channel_id: msg.channel.id,
        });
        result.save({ upsert: true })
          .then(() => {
            msg.channel.sendMessage(`This channel will now receive tweets from **${result.screen_name}**`)
              .then(resolve).catch(reject);
          })
          .catch(err => {
            logger.error(err);
            msg.channel.sendMessage('There was a database error, please try again.');
            reject(err);
          });
      } else {
        msg.channel.sendMessage(`This channel already receives tweets from **${result.screen_name}**`)
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
        logger.error('Error getting twitter user', params[1], err);
        if (err[0] || err[0].code === 17) {
          msg.channel.sendMessage(`**${params[1]}** is not a known twitter user.`).then(resolve).catch(reject);
        }
        return;
      }
      const entry = client.mongo.twitterChannels(user);
      try {
        await entry.save();
      } catch (err) {
        logger.error(err);
        msg.channel.sendMessage('There was a database error, please try again.');
        reject(err);
      }
      msg.channel.sendMessage(`This channel will now receive tweets from ` +
        `**${user.screen_name}**\n\nWe aren't yet streaming that twitter account. ` +
        `Please allow up to 10 minutes to sync.\n` +
        `Type \`\`yes\`\` within 15 seconds to be notified when it syncs.`)
        .then(() => {
          const collector = new Discord.MessageCollector(msg.channel,
            x => x.author.id === msg.author.id, { time: 15000 });
          collector.on('message', m => {
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
            if (reason === 'time') {
              resolve();
            }
          });
        }).catch(reject);
    }
  });
}

function removeChannel(client, msg, result, params) {
  return new Promise(async(resolve, reject) => {
    if (result) {
      let index = -1;
      for (let i = 0; i < result.channels.length; i++) {
        if (result.channels[i].channel_id === msg.channel.id) {
          index = i;
          break;
        }
      }
      if (index === -1) {
        msg.channel.sendMessage(`**${result.screen_name}** is not registered to receive tweets in this channel.`)
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
          logger.error(err);
          msg.channel.sendMessage('There was a database error, please try again.');
          reject(err);
          return;
        }
        msg.channel.sendMessage(`This channel will no longer receive tweets from **${result.screen_name}**`)
          .then(resolve).catch(reject);
      }
    } else {
      let user;
      try {
        user = await client.twitter.getUser(params[1]);
      } catch (err) {
        logger.error('Error getting twitter user', params[1], err);
        if (err[0] || err[0].code === 17) {
          msg.channel.sendMessage(`**${params[1]}** is not a known twitter user.`).then(resolve).catch(reject);
        }
        return;
      }
      msg.channel.sendMessage(`**${user[0].screen_name}** is not registered to post tweets in any channels.`)
        .then(resolve).catch(reject);
    }
  });
}
