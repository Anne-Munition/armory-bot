'use strict';
exports.info = {
  name: 'welcome',
  desc: 'Add | Remove | List channels to post Welcome/Part messages to',
  usage: 'welcome <add | remove | list>',
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
    mongo.welcomeChannels.find({ server_id: msg.guild.id }, (err, channels) => {
      if (err) {
        logger.error('Error getting welcome channels from mongoDB', err);
        return;
      }
      logger.debug('welcome channels list', JSON.stringify(channels));
      let str = 'Welcome messages are posted in channel(s):\n\n';
      const names = channels.map(c => {
        const channel = msg.guild.channels.find('id', c.channel_id);
        if (channel) {
          return `*#${channel.name}*`;
        } else {
          return '';
        }
      });
      if (names.length === 0) {
        msg.channel.sendMessage('No channels on this server currently post a welcome message.');
        return;
      }
      str += names.join('\n');
      msg.channel.sendMessage(str);
    });
  } else {
    // Search database for existing entry
    mongo.welcomeChannels.find({ channel_id: msg.channel.id }, (err, channels) => {
      if (err) {
        logger.error('Error getting welcome channels from mongoDB', err);
        return;
      }
      logger.debug('welcome channels match results', JSON.stringify(channels));
      switch (params[0]) {
        case 'add':
          if (channels.length === 0) {
            const entry = mongo.welcomeChannels({
              server_id: msg.guild.id,
              channel_id: msg.channel.id,
            });
            entry.save(e => {
              if (e) {
                logger.error('Error Saving welcome channel to the mongoDB', e);
                return;
              }
              msg.channel.sendMessage('This channel will now post welcome messages.');
            });
          } else {
            msg.channel.sendMessage('This channel already posts welcome messages.');
          }
          break;
        case 'remove':
          if (channels.length === 0) {
            msg.channel.sendMessage('This channel didn\'t post welcome messages.');
            return;
          }
          mongo.welcomeChannels.remove({ _id: channels[0]._id }, e => {
            if (e) {
              logger.error('Error removing welcome channel from the mongoDB', e);
              return;
            }
            msg.channel.sendMessage('This channel will no longer post welcome messages.');
          });
          break;
        default:
          msg.channel.sendMessage(`\`\`${config.commands.prefix}welcome < add | remove | list >\`\``);
          break;
      }
    });
  }
};
