'use strict';
exports.info = {
  desc: 'Manage posting welcome/part messages to channels.',
  usage: '<add | remove | list>',
  aliases: [],
};

const logger = require('winston');
const utils = require('../utilities');

// <add | remove | list> channels to post join / part messages to
exports.run = (client, msg, params = []) => new Promise(async(resolve, reject) => {
  if (msg.channel.type === 'dm') {
    msg.reply('Unable to use the **welcome** command from DM channels.');
    return resolve();
  }
  if (params.length === 0) {
    utils.usage(msg, exports.info);
    return resolve();
  }
  // Lowercase all the parameters
  params = params.map(p => p.toLowerCase());
  if (params[0] === 'list') {
    // Get list of all welcome messages for the msg guild only
    let channels;
    try {
      channels = await client.mongo.welcomeChannels.find({ server_id: msg.guild.id });
    } catch (err) {
      logger.error('Error getting welcome channels from mongoDB', err);
      return reject(err);
    }
    logger.debug('welcome channels list', channels.length);
    let str = 'Welcome messages are posted in channel(s):\n\n';
    const names = channels.map(c => {
      const channel = msg.guild.channels.get(c.channel_id);
      if (channel) {
        return channel;
      } else {
        return null;
      }
    })
      .filter(x => x)
      .sort((a, b) => a.position - b.position)
      .map(x => x.toString());
    if (names.length === 0) {
      msg.channel.sendMessage('No channels on this server currently post a welcome message.');
      return resolve();
    }
    str += names.join('\n');
    msg.channel.sendMessage(str);
    return resolve();
  } else if (params[0] === 'add' || params[0] === 'remove') {
    // Search database for existing entry
    let channels;
    try {
      channels = await client.mongo.welcomeChannels.find({ channel_id: msg.channel.id });
    } catch (err) {
      logger.error('Error getting welcome channels from mongoDB', err);
      return reject(err);
    }
    logger.debug('welcome channels add/remove', channels.length);
    switch (params[0]) {
      case 'add':
        if (channels.length === 0) {
          const entry = client.mongo.welcomeChannels({
            server_id: msg.guild.id,
            channel_id: msg.channel.id,
          });
          entry.save(err => {
            if (err) {
              logger.error('Error Saving welcome channel to the mongoDB', err);
              reject(err);
            } else {
              msg.channel.sendMessage('This channel will now post welcome messages.');
              resolve();
            }
          });
        } else {
          msg.channel.sendMessage('This channel already posts welcome messages.');
          resolve();
        }
        break;
      case 'remove':
        if (channels.length === 0) {
          msg.channel.sendMessage('This channel doesn\'t currently post welcome messages.');
          return resolve();
        }
        try {
          await client.mongo.welcomeChannels.remove({ _id: channels[0]._id });
        } catch (err) {
          logger.error('Error removing welcome channel from the mongoDB', err);
          return reject(err);
        }
        msg.channel.sendMessage('This channel will no longer post welcome messages.');
        resolve();
        break;
      default:
        utils.usage(msg, exports.info);
        resolve();
        break;
    }
  }
  return null;
});
