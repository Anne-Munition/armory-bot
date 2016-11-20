'use strict';
exports.info = {
  desc: 'Manage posting Tweets to Discord channels.',
  usage: '<add | remove | list>',
  aliases: [],
};

const logger = require('winston');
const twitterStreams = require('../twitter')();

// <add | remove | list> channels to post tweets to
exports.run = (client, msg, params = []) => {
  // Exit if no parameters were passed
  if (params.length === 0) {
    return;
  }
  // Lowercase all parameters
  params = params.map(p => p.toLowerCase());
  logger.debug(JSON.stringify(params));
  if (params[0] === 'list') {
    // TODO show me the entire list
    client.mongo.twitterChannels.find({})
      .then(results => {
        if (results.length === 0) {
          msg.channel.sendMessage('No twitter accounts are currently streaming tweets to any channels.');
          return;
        }
        const thisGuild = results.filter(n => {
          const s = n.channels.filter(c => c.server_id === msg.guild.id);
          return !(s === null);
        });
        let str = '';
        thisGuild.forEach(n => {
          const channels = n.channels.map(c => {
            const channel = client.channels.get(c.channel_id);
            return channel ? channel.toString() : null;
          })
            .filter(x => x);
          if (channels.length > 0) {
            str += `Tweets from **${n.screen_name}** are posted in:\n`;
          }
          str += channels.join('\n');
          str += '\n';
        });
        msg.channel.sendMessage(str);
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
            if (result) {
              const chan = result.channels.filter(x => x.server_id === msg.guild.id && x.channel_id === msg.channel.id);
              if (chan.length === 0) {
                result.channels.push({
                  server_id: msg.guild.id,
                  channel_id: msg.channel.id,
                });
                result.save({ upsert: true })
                  .then(() => {
                    msg.channel.sendMessage(`This channel will now post tweets from **${result.screen_name}**`);
                  })
                  .catch(err => {
                    logger.error(err);
                    msg.channel.sendMessage('There was a database error, please try again.');
                  });
              } else {
                msg.channel.sendMessage(`This channel already posts tweets from **${result.screen_name}**`);
              }
            } else {
              // We are not streaming this twitter user yet.
              twitterStreams.getUser(params[1])
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
                        msg.channel.sendMessage(`**${user[0].screen_name}** has not been streamed yet by this bot ` +
                          `so it may take some time for it to sync.`);
                        client.twitter.reload = true;
                      })
                      .catch(logger.error);
                  }
                })
                .catch(err => {
                  logger.error('Error getting twitter user', params[1], err);
                  msg.channel.sendMessage(`**${params[1]}** is not a twitter user.`);
                });
            }
            break;
          case 'remove':
            if (result) {
              let index = -1;
              for (let i = 0; i < result.channels.length; i++) {
                if (result.channels[i].channel_id === msg.channel.id) {
                  index = i;
                }
              }
              if (index === -1) {
                msg.channel.sendMessage(`**${result.screen_name}** ` +
                  `is not registered to post tweets in this channel.`);
              } else {
                result.channels.splice(index, 1);
                if (result.channels.length === 0) {
                  result.remove()
                    .then(() => {
                      msg.channel.sendMessage(`This bot will no longer post tweets from **${result.screen_name}**`);
                      client.twitter.reload = true;
                    })
                    .catch(err => {
                      logger.error(err);
                      msg.channel.sendMessage('There was a database error, please try again.');
                    });
                } else {
                  result.save({ upsert: true })
                    .then(() => {
                      msg.channel.sendMessage(`This channel will no longer post tweets from **${result.screen_name}**`);
                    })
                    .catch(err => {
                      logger.error(err);
                      msg.channel.sendMessage('There was a database error, please try again.');
                    });
                }
              }
            } else {
              twitterStreams.getUser(params[1])
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
            break;
          default:
            break;
        }
      })
      .catch(logger.error);
  }
};
