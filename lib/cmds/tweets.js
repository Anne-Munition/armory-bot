'use strict';
exports.info = {
  name: 'tweets',
  desc: 'Add | Remove | List channels to post tweets to',
  usage: 'tweets <add | remove | list>',
};

const logger = require('winston');
const config = require('../../config');

// <add | remove | list> channels to post tweets to
exports.run = (d, m, q = [], mongo) => {
  if (m.channel.type === 'dm') {
    m.reply('Unable to use **tweets** command from DM channels.');
    return;
  }
  q.forEach(x => x.toLowerCase());
  if (q[0] === 'list') {
    mongo.twitterChannels.find({ server_id: m.guild.id }, (err, channels) => {
      if (err) {
        logger.error('Error getting tweets channels from mongoDB', err);
        return;
      }
      logger.debug('tweets channels list', JSON.stringify(channels));
      let str = 'Tweets are pushed to channel(s):\n\n';
      const names = channels.map(c => {
        const channel = m.guild.channels.find('id', c.channel_id);
        if (channel) {
          return `*#${channel.name}*`;
        } else {
          return '';
        }
      });
      if (names.length === 0) {
        m.channel.sendMessage('No channels on this server currently receives tweets.');
        return;
      }
      str += names.join('\n');
      m.channel.sendMessage(str);
    });
  } else {
    // Search database for existing entry
    mongo.twitterChannels.find({ channel_id: m.channel.id }, (err, channels) => {
      if (err) {
        logger.error('Error getting tweets channels from mongoDB', err);
        return;
      }
      logger.debug('tweet channels match results', JSON.stringify(channels));
      switch (q[0]) {
        case 'add':
          if (channels.length === 0) {
            const entry = mongo.twitterChannels({
              server_id: m.guild.id,
              channel_id: m.channel.id,
            });
            entry.save(e => {
              if (e) {
                logger.error('Error Saving tweet channel to the mongoDB', e);
                return;
              }
              m.channel.sendMessage('This channel will now receives tweets.');
            });
          } else {
            m.channel.sendMessage('This channel already receives tweets.');
          }
          break;
        case 'remove':
          if (channels.length === 0) {
            m.channel.sendMessage('This channel didn\'t receive tweets.');
            return;
          }
          mongo.twitterChannels.remove({ _id: channels[0]._id }, e => {
            if (e) {
              logger.error('Error removing tweet channel from the mongoDB', e);
              return;
            }
            m.channel.sendMessage('This channel will no longer receive tweets.');
          });
          break;
        default:
          m.channel.sendMessage(`\`\`${config.commands.prefix}tweets < add | remove | list >\`\``);
          break;
      }
    });
  }
};
