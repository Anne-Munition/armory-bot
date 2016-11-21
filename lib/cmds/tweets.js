'use strict';
exports.info = {
  desc: 'Manage posting Tweets to Discord channels.',
  usage: '<add | remove | list>',
  aliases: [],
};

const config = require('../../config');
const logger = require('winston');
const twitter = require('../twitter')();
const Discord = require('discord.js');

// <add | remove | list> channels to post tweets to
exports.run = (client, msg, params = []) => {
  if (msg.channel.type === 'dm') {
    msg.reply('Tweets to DM channels is currently not supported.');
    return;
  }
  // Exit if no parameters were passed
  if (params.length === 0) {
    return;
  }
  // Lowercase all parameters
  params = params.map(p => p.toLowerCase());
  logger.debug(JSON.stringify(params));
  if (params[0] === 'list') {
    client.mongo.twitterChannels.find({})
      .then(results => {
        if (results.length === 0) {
          msg.channel.sendMessage('No twitter accounts are currently streaming tweets to any channels.');
          return;
        }
        let str = '';
        if (params[1] && params[1] === 'all' && msg.author.id === config.owner_id) {
          results.forEach(n => {
            const channels = n.channels.map(c => client.channels.get(c.channel_id))
              .filter(x => x)
              .map(x => `${x.guild.name} - ${x.toString()}`);
            if (channels.length > 0) {
              str += `Tweets from **${n.screen_name}** are posted in:\n`;
              str += channels.join('\n');
              str += '\n\n';
            }
          });
          msg.channel.sendMessage(str);
        } else {
          const thisGuild = results.filter(n => {
            const s = n.channels.filter(c => c.server_id === msg.guild.id);
            return !(s === null);
          });
          thisGuild.forEach(n => {
            const channels = n.channels.filter(c => c.server_id === msg.guild.id)
              .map(c => {
                const channel = client.channels.get(c.channel_id);
                return channel ? channel.toString() : '';
              });
            if (channels.length > 0) {
              str += `Tweets from **${n.screen_name}** are posted in:\n`;
              str += channels.join('\n');
              str += '\n\n';
            }
          });
          msg.channel.sendMessage(str);
        }
      })
      .catch(logger.error);
  } else {
    if (params.length < 2) {
      logger.debug('Need to enter a twitter username');
      return;
    }
    const r = new RegExp(params[1], 'i');
    client.mongo.twitterChannels.findOne({ screen_name: { $regex: r } })
      .then(result => {
        logger.debug('twitterChannels match result', JSON.stringify(result, null, 2));
        switch (params[0]) {
          case 'add':
            addChannel(client, msg, result, params);
            break;
          case 'remove':
            removeChannel(msg, result, params);
            break;
          default:
            break;
        }
      })
      .catch(logger.error);
  }
};

function addChannel(client, msg, result, params) {
  if (result) {
    const chan = result.channels.filter(x => x.server_id === msg.guild.id && x.channel_id === msg.channel.id);
    if (chan.length === 0) {
      result.channels.push({
        server_id: msg.guild.id,
        channel_id: msg.channel.id,
      });
      result.save({ upsert: true })
        .then(() => {
          msg.channel.sendMessage(`This channel will now receive tweets from **${result.screen_name}**`);
        })
        .catch(err => {
          logger.error(err);
          msg.channel.sendMessage('There was a database error, please try again.');
        });
    } else {
      msg.channel.sendMessage(`This channel already receives tweets from **${result.screen_name}**`);
    }
  } else {
    // We are not streaming this twitter user yet.
    twitter.getUser(params[1])
      .then(user => {
        if (user && user[0]) {
          const data = {
            screen_name: user[0].screen_name,
            id: user[0].id_str,
            channels: [
              {
                server_id: msg.guild.id,
                channel_id: msg.channel.id,
              },
            ],
          };
          const entry = client.mongo.twitterChannels(data);
          entry.save()
            .then(() => {
              msg.channel.sendMessage(`This channel will now receive tweets from ` +
                `**${user[0].screen_name}**\n\nWe aren't yet streaming that twitter account. ` +
                `Please allow up to 10 minutes to sync.\n` +
                `Type \`\`yes\`\` within 15 seconds to be notified when it syncs.`);
              const collector = new Discord.MessageCollector(msg.channel,
                x => x.author.id === msg.author.id, { time: 15000 });
              collector.on('message', m => {
                if (m.content.toLowerCase() === 'yes') {
                  collector.stop('yes');
                  msg.reply(':thumbsup:');
                }
              });
              collector.on('end', (msgArray, reason) => {
                if (reason === 'yes') {
                  client.twitter.mentions.push({
                    user: msg.author,
                    channel: msg.channel,
                    screen_name: user[0].screen_name,
                  });
                }
              });
            })
            .catch(logger.error);
        }
      })
      .catch(err => {
        logger.error('Error getting twitter user', params[1], err);
        msg.channel.sendMessage(`**${params[1]}** is not a twitter user.`);
      });
  }
}

function removeChannel(msg, result, params) {
  if (result) {
    let index = -1;
    for (let i = 0; i < result.channels.length; i++) {
      if (result.channels[i].channel_id === msg.channel.id) {
        index = i;
      }
    }
    if (index === -1) {
      msg.channel.sendMessage(`**${result.screen_name}** ` +
        `is not registered to receive tweets in this channel.`);
    } else {
      result.channels.splice(index, 1);
      if (result.channels.length === 0) {
        result.remove()
          .then(() => {
            msg.channel.sendMessage(`This bot will no longer receive tweets from **${result.screen_name}**`);
          })
          .catch(err => {
            logger.error(err);
            msg.channel.sendMessage('There was a database error, please try again.');
          });
      } else {
        result.save({ upsert: true })
          .then(() => {
            msg.channel.sendMessage(`This channel will no longer receive tweets from ` +
              `**${result.screen_name}**`);
          })
          .catch(err => {
            logger.error(err);
            msg.channel.sendMessage('There was a database error, please try again.');
          });
      }
    }
  } else {
    twitter.getUser(params[1])
      .then(user => {
        if (user && user[0]) {
          msg.channel.sendMessage(`**${user[0].screen_name}** ` +
            `is not registered to post tweets in any channels.`);
        }
      })
      .catch(err => {
        logger.error(err);
        msg.channel.sendMessage(`**${params[1]}** is not a twitter user.`);
      });
  }
}
