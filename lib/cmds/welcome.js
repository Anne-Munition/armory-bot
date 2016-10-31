'use strict';
exports.info = {
  name: 'welcome',
  desc: 'Add | Remove | List channels to post Welcome/Part messages to',
  usage: 'welcome <add | remove | list>',
  aliases: [],
};

const logger = require('winston');
const utils = require('../utilities');

// <add | remove | list> channels to post join / part messages to
exports.run = (client, msg, params = []) => {
  if (msg.channel.type === 'dm') {
    msg.reply('Unable to use **welcome** command from DM channels.');
    return;
  }
  // Lowercase all the parameters
  params.forEach(x => x.toLowerCase());
  if (params[0] === 'list') {
    // Get list of all welcome messages for the msg guild only
    client.mongo.welcomeChannels.find({ server_id: msg.guild.id })
      .then(channels => {
        logger.debug('welcome channels list', JSON.stringify(channels, null, 2));
        let str = 'Welcome messages are posted in channel(s):\n\n';
        const names = channels.map(c => {
          const channel = msg.guild.channels.get(c.channel_id);
          if (channel) {
            return `*#${channel.name}*`;
          } else {
            return '';
          }
        });
        if (names.length === 0) {
          msg.channel.sendMessage('No channels on this server currently post a welcome message.');
          utils.finish(client, msg, exports.info.name);
          return;
        }
        str += names.join('\n');
        msg.channel.sendMessage(str);
        utils.finish(client, msg, exports.info.name);
      })
      .catch(err => {
        logger.error('Error getting welcome channels from mongoDB', err);
      });
  } else {
    // Search database for existing entry
    client.mongo.welcomeChannels.find({ channel_id: msg.channel.id })
      .then(channels => {
        logger.debug('welcome channels match results', JSON.stringify(channels, null, 2));
        switch (params[0]) {
          case 'add':
            if (channels.length === 0) {
              const entry = client.mongo.welcomeChannels({
                server_id: msg.guild.id,
                channel_id: msg.channel.id,
              });
              entry.save(e => {
                if (e) {
                  logger.error('Error Saving welcome channel to the mongoDB', e);
                  return;
                }
                msg.channel.sendMessage('This channel will now post welcome messages.');
                utils.finish(client, msg, exports.info.name);
              });
            } else {
              msg.channel.sendMessage('This channel already posts welcome messages.');
            }
            utils.finish(client, msg, exports.info.name);
            break;
          case 'remove':
            if (channels.length === 0) {
              msg.channel.sendMessage('This channel doesn\'t currently post welcome messages.');
              utils.finish(client, msg, exports.info.name);
              return;
            }
            client.mongo.welcomeChannels.remove({ _id: channels[0]._id }, e => {
              if (e) {
                logger.error('Error removing welcome channel from the mongoDB', e);
                return;
              }
              msg.channel.sendMessage('This channel will no longer post welcome messages.');
              utils.finish(client, msg, exports.info.name);
            });
            break;
          default:
            msg.channel.sendMessage(`\`\`${client.config.prefix}welcome < add | remove | list >\`\``);
            break;
        }
      })
      .catch(err => {
        logger.error('Error getting welcome channels from mongoDB', err);
      });
  }
};
