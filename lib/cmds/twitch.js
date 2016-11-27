'use strict';
exports.info = {
  desc: 'Manage which channels post when Twitch streams go live.',
  usage: '<add | remove | list>',
  aliases: [],
};

const config = require('../../config');
const logger = require('winston');
const utils = require('../utilities');

// <add | remove | list> channels to post tweets to
exports.run = (client, msg, params = []) => {
  if (msg.channel.type === 'dm') {
    msg.reply('Posting when Twitch channels go live is not currently supported for DM channels.');
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
    client.mongo.twitchChannels.find({})
      .then(results => {
        if (results.length === 0) {
          msg.channel.sendMessage('No Twitch channels are currently posting when they go live.');
          return;
        }
        let str = '';
        if (params[1] && params[1] === 'all' && msg.author.id === config.owner_id) {
          results.forEach(n => {
            const channels = n.channels.map(c => client.channels.get(c.channel_id))
              .filter(x => x)
              .sort((a, b) => a.position - b.position)
              .map(x => `${x.guild.name} - **#${x.name}**`);
            if (channels.length > 0) {
              str += getListHeader(n.display_name);
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
              .map(c => client.channels.get(c.channel_id))
              .filter(x => x)
              .sort((a, b) => a.position - b.position)
              .map(x => x.toString());
            if (channels.length > 0) {
              str += getListHeader(n.display_name);
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
      logger.debug('Need to enter a Twitch username');
      return;
    }
    const r = new RegExp(params[1], 'i');
    client.mongo.twitchChannels.findOne({ display_name: { $regex: r } })
      .then(result => {
        logger.debug('twitchChannels match result', JSON.stringify(result, null, 2));
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
          let n = '';
          if (client.twitch.waiting.indexOf(result.display_name.toLowerCase()) !== -1) {
            n = getWarningMessage();
          }
          msg.channel.sendMessage(`This channel will now be notified when **${result.display_name}** ` +
            `goes live on Twitch.${n}`);
        })
        .catch(err => {
          logger.error(err);
          msg.channel.sendMessage('There was a database error, please try again.');
        });
    } else {
      msg.channel.sendMessage(`This channel already receives posts when ` +
        `**${result.display_name}** goes live on Twitch.`);
    }
  } else {
    // We are not monitoring this twitch channel yet.
    getTwitchUser(params[1], msg)
      .then(data => {
        if (data) {
          data = {
            display_name: data.name,
            twitch_id: data.id,
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
              msg.channel.sendMessage(`This channel will now be notified when **${data.display_name}** goes live on ` +
                `Twitch.${getWarningMessage()}`);
              client.twitch.waiting.push(data.display_name.toLowerCase());
            })
            .catch(logger.error);
        }
      })
      .catch(logger.error);
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
      msg.channel.sendMessage(`This channel does not currently post when **${result.display_name}** ` +
        `goes live on Twitch.`);
    } else {
      result.channels.splice(index, 1);
      if (result.channels.length === 0) {
        result.remove()
          .then(() => {
            msg.channel.sendMessage(`This bot will no longer post when **${result.display_name}** ` +
              `goes live on Twitch.`);
          })
          .catch(err => {
            logger.error(err);
            msg.channel.sendMessage('There was a database error, please try again.');
          });
      } else {
        result.save({ upsert: true })
          .then(() => {
            msg.channel.sendMessage(`This channel will no longer post when ` +
              `**${result.display_name}** goes live on Twitch.`);
          })
          .catch(err => {
            logger.error(err);
            msg.channel.sendMessage('There was a database error, please try again.');
          });
      }
    }
  } else {
    getTwitchUser(params[1], msg)
      .then(data => {
        if (data) {
          msg.channel.sendMessage(`No channels are registered to post when **${data.name}** ` +
            `goes live on Twitch.`);
        }
      })
      .catch(logger.error);
  }
}

function getTwitchUser(name, msg) {
  return new Promise((resolve, reject) => {
    // TODO: This endpoint will be depreciated in Feb, 2018
    const uri = `https://api.twitch.tv/kraken/users/` +
      `${name}?client_id=${config.twitch.client_id}`;
    logger.debug(uri);
    utils.jsonRequest(uri)
      .then(body => {
        logger.debug(body);
        resolve({
          name: body.display_name || body.name,
          id: body._id.toString(),
        });
      })
      .catch(err => {
        if (err === 400 || err === 404) {
          msg.channel.sendMessage(`**${name}** is not a known Twitch channel.`);
        }
        reject(err);
      });
  });
}

function getListHeader(name) {
  return `**${utils.makePossessive(name)}** Twitch streams post to:\n`;
}

function getWarningMessage() {
  return '\n\n We have not yet synced with this Twitch channel.' +
    '\nAn initial message may post within a few minutes if the channel is currently live.';
}
