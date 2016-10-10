'use strict';
const fs = require('fs');
const path = require('path');
const config = require('../config');
config.tempPath = path.join(__dirname, '../temp');
const logger = require('./logger')();
const mongo = require('./mongo')();
const discord = require('./discord')();
const perms = require('./permissions');
const myEvents = require('./events');
const fetch = require('node-fetch');
require('./twitter')();
require('./perf');

logger.info('Starting ArmoryBot: PID:', process.pid);

// Create a temp folder if it does not exist
if (!fs.existsSync(config.tempPath)) {
  logger.debug('Creating temp directory');
  fs.mkdirSync(config.tempPath);
}

// A new member has joined a connected server
discord.client.on('guildMemberAdd', (guild, member) => {
  // Get list of welcome channels with same server_id
  logger.debug('A member joined the server');
  mongo.welcomeChannels.find({ server_id: guild.id }, (err, channels) => {
    if (err) {
      logger.error('Error getting welcomeMessages from mongoDB', err);
    } else {
      // Post welcome message to each channel found
      logger.debug('Posting welcome messages in registered channels');
      channels.forEach(c => {
        // Resolve the channel
        const channel = guild.channels.find('id', c.channel_id);
        if (channel) {
          channel.sendMessage(`**${member.user.username}** #${member.user.discriminator}` +
            ` has just joined the Discord Server!`);
        }
      });
    }
  });
});

// A member has left/kick/ban from a connected server
discord.client.on('guildMemberRemove', (guild, member) => {
  // Get list of welcome channels with same server_id
  logger.debug('A member left/kick/ban from the server');
  mongo.welcomeChannels.find({ server_id: guild.id }, (err, channels) => {
    if (err) {
      logger.error('Error getting welcomeMessages from mongoDB', err);
    } else {
      // Post farewell message to each channel found
      channels.forEach(c => {
        // Resolve the channel
        const channel = guild.channels.find('id', c.channel_id);
        if (channel) {
          channel.sendMessage(`**${member.user.username}** #${member.user.discriminator}` +
            ` was removed from the Discord Server.`);
        }
      });
    }
  });
});

discord.client.on('message', msg => {
  prefixCommands(msg);
});

function prefixCommands(msg) {
  // Exit if message doesn't use our prefix
  if (!msg.content.startsWith(config.commands.prefix)) {
    return;
  }
  // Split message into an array
  const params = msg.content.split(' ');
  // Pull first index and remove prefix
  const cmd = params.shift().slice(config.commands.prefix.length);
  // Exit if no command was given (prefix only)
  if (!cmd) {
    return;
  }
  logger.debug(cmd, JSON.stringify(params));
  // Attempt to get command from Collection
  const command = discord.cmds.get(cmd);
  // Run the command if it exists
  if (command) {
    // Check command permissions against database
    perms.check(mongo, msg, cmd)
      .then(allowed => {
        if (allowed) {
          logger.debug(`Running cmd '${cmd}'`);
          command.run(discord.client, msg, params, mongo);
        } else {
          logger.debug(`'${msg.author.username}' does not have perms to run '${cmd}' in channel '${msg.channel.name}'`);
        }
      })
      .catch(err => {
        logger.error('Unable to get permissions from mongoDB', msg.channel.id, cmd, err);
      });
  } else {
    logger.debug(`The cmd '${cmd}' does not exist or is not loaded.`);
  }
}

myEvents.on('tweet', data => {
  // Data should have the string to send to Discord and a media object <Array> of images/videos to embed if any
  logger.debug('Tweet Endpoint', JSON.stringify(data));
  // List to hold all message ids to be stored in case of deletion
  const msgIds = [];
  let count = 0;
  let target = 0;
  // Get the channel ids to post tweets to
  mongo.twitterChannels.find({}, (err, channels) => {
    if (err) {
      logger.error('Error getting twitter channels from mongoDB:', err);
    } else {
      logger.debug('Twitter post channels:', JSON.stringify(channels));
      target = channels.length + (channels.length * data.media.length);
      channels.forEach(c => {
        postToChannel(c);
      });
    }
  });

  function postToChannel(c) {
    const channel = discord.client.channels.find('id', c.channel_id);
    channel.sendMessage(data.str)
      .then(headerMsg => {
        msgIds.push({ channel: headerMsg.channel.id, message: headerMsg.id });
        data.media.forEach(media => {
          const m = media.video && !media.video.includes('http') ? media.video : media.image;
          channel.sendFile(m, path.parse(m).base)
            .then(mediaMsg => {
              msgIds.push({ channel: mediaMsg.channel.id, message: mediaMsg.id });
              next();
            })
            .catch(() => {
              next();
            });
        });
        next();
      })
      .catch(() => {
        next();
      });

    function next() {
      count++;
      if (count >= target) {
        myEvents.emit('remove_temp', data.id);
        const tweetMessages = {
          tweet_id: data.id,
          messages: msgIds,
        };
        const entry = mongo.tweetMessages(tweetMessages);
        entry.save()
          .then(() => {
            logger.debug('Tweet message ids from Discord have been saved');
          })
          .catch(e => {
            logger.error('Error saving Tweet message ids from Discord', e);
          });
      }
    }
  }
});

// A tweet was deleted. Delete all corresponding Discord messages
myEvents.on('delete_tweet', tweet => {
  // Get the list of messages
  mongo.tweetMessages.findOne({ tweet_id: tweet.delete.status.id_str }, (err, result) => {
    if (err || !result) {
      return;
    }
    result.messages.forEach(message => {
      const uri = `https://discordapp.com/api/channels/${message.channel}/messages/${message.message}`;
      fetch(encodeURI(uri), {
        method: 'delete',
        headers: {
          Authorization: `Bot ${config.bot_token}`,
        },
      })
        .then()
        .catch(e => {
          logger.error('Error deleting twitter messaged from Discord', e);
        });
    });
  });
});
